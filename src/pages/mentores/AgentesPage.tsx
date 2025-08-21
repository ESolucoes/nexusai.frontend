import { useEffect, useRef, useState } from "react"
import Header from "../../components/layout/Header"
import "../../styles/agentes/agentes.css"
import { api } from "../../lib/api"

type Msg = { id: string; role: "user" | "assistant"; content: string; createdAt?: string }

const ASSISTANTS = [
  { key: "PAUL_GPT", label: "Paul GPT" },
  { key: "FAQ_NEXUS", label: "FAQ Nexus" },
  { key: "TESTE_PERCEPCAO_VAGAS", label: "Teste Percepção Vagas" },
  { key: "MSG_HEADHUNTER", label: "Mensagem p/ HeadHunter" },
  { key: "CALEIDOSCOPIO_CONTEUDO", label: "Caleidoscópio" },
]

export default function AgentesPage() {
  const [assistantKey, setAssistantKey] = useState<string>(ASSISTANTS[0].key)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const listRef = useRef<HTMLDivElement | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    document.body.classList.remove("login-bg")
    document.body.classList.add("no-scroll")
    return () => document.body.classList.remove("no-scroll")
  }, [])

  // carrega histórico quando troca de assistant
  useEffect(() => {
    setSessionId(null)
    setMessages([])
    api.get<{ sessionId?: string; messages: Msg[] }>(`/agentes/session/latest?assistantKey=${assistantKey}`)
      .then(({ data }) => {
        if (data?.sessionId) setSessionId(data.sessionId)
        setMessages(data?.messages ?? [])
      })
      .catch(() => setMessages([]))
  }, [assistantKey])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading, showHistory])

  const resizeTA = () => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = "0px"
    ta.style.height = Math.min(Math.max(ta.scrollHeight, 40), 220) + "px"
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const tmpId = crypto.randomUUID()
    const userMsg: Msg = { id: tmpId, role: "user", content: text }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    resizeTA()

    setLoading(true)
    try {
      const { data } = await api.post<{ sessionId: string; reply: Msg }>(
        `/agentes/messages`,
        { assistantKey, sessionId, content: text }
      )
      if (!sessionId) setSessionId(data.sessionId)
      setMessages(prev => [...prev, data.reply])
    } catch (e) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Falha ao enviar. Tente novamente." }])
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); void send()
    }
  }

  return (
    <div className="agentes-page">
      <Header />

      {/* toolbar fixa */}
      <div className="chat-toolbar">
        <div className="chat-toolbar-inner">
          <div className="agent-actions-left">
            <div className="agent-select">
              <label>Agente</label>
              <select value={assistantKey} onChange={(e) => setAssistantKey(e.target.value)}>
                {ASSISTANTS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </div>

            <button className="btn-secondary" onClick={() => setShowHistory(true)}>
              Histórico
            </button>
          </div>
          {/* espaço para ações futuras (ex: limpar, exportar) */}
          <div />
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-content" ref={listRef}>
          {messages.length === 0 && !loading && (
            <div className="msg-row assistant">
              <div className="msg-bubble"><pre className="msg-text">Em que posso ajudar?</pre></div>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`msg-row ${m.role}`}>
              <div className="msg-bubble"><pre className="msg-text">{m.content}</pre></div>
            </div>
          ))}
          {loading && (
            <div className="msg-row assistant">
              <div className="msg-bubble">
                <span className="typing-dots"><i></i><i></i><i></i></span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="composer-wrap">
        <div className="composer">
          <textarea
            ref={taRef}
            className="composer-input"
            placeholder="Pergunte qualquer coisa"
            value={input}
            onChange={(e) => { setInput(e.target.value); resizeTA() }}
            onKeyDown={onKeyDown}
            rows={1}
          />
          <button className="composer-send" onClick={send} disabled={loading || input.trim() === ""}>
            Enviar
          </button>
        </div>
        <p className="composer-hint">Enter envia • Shift+Enter quebra linha</p>
      </div>

      {/* Modal de histórico */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Histórico da sessão</div>
              <button className="modal-close" onClick={() => setShowHistory(false)}>Fechar</button>
            </div>
            <div className="modal-body">
              <div className="history-list">
                {messages.length === 0 ? (
                  <div className="history-item">
                    <span className="tag">info</span>
                    <div className="text">Sem mensagens nesta sessão.</div>
                  </div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className="history-item">
                      <span className="tag">{m.role}</span>
                      <div className="text">{m.content}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
