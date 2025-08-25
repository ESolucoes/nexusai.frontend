import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import MentoradoHeader from "../../components/layout/MentoradoHeader"
import "../../styles/agentes/agentes.css"
import { api, getToken, decodeJwt, clearToken } from "../../lib/api"

type Msg = { id: string; role: "user" | "assistant"; content: string; createdAt?: string }
type Sessao = { id: string; createdAt: string; lastMessageAt: string; lastSnippet: string; totalMessages: number }

const ASSISTANTS = [
  { key: "PAUL_GPT", label: "Paul GPT" },
  { key: "FAQ_NEXUS", label: "FAQ Nexus" },
  { key: "TESTE_PERCEPCAO_VAGAS", label: "Teste Percepção Vagas" },
  { key: "MSG_HEADHUNTER", label: "Mensagem p/ HeadHunter" },
  { key: "CALEIDOSCOPIO_CONTEUDO", label: "Caleidoscópio" },
]

function buildBearer(): string | null {
  const raw = getToken()
  if (!raw) return null
  const hasPrefix = /^Bearer\s+/i.test(raw)
  return hasPrefix ? raw : `Bearer ${raw}`
}

export default function AgentesPage() {
  const navigate = useNavigate()

  const [assistantKey, setAssistantKey] = useState<string>(ASSISTANTS[0].key)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState<Sessao[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [authError, setAuthError] = useState<string | null>(null)

  const listRef = useRef<HTMLDivElement | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    document.body.classList.remove("login-bg")
    document.body.classList.add("no-scroll")
    return () => document.body.classList.remove("no-scroll")
  }, [])

  // Garantir token válido e setar Authorization default (normalizado)
  useEffect(() => {
    const bearer = buildBearer()
    if (!bearer) {
      clearToken()
      navigate("/")
      return
    }
    const t = (bearer || "").replace(/^Bearer\s+/i, "")
    const payload = decodeJwt<any>(t)
    const exp = payload?.exp
    if (exp && Math.floor(Date.now() / 1000) >= exp) {
      clearToken()
      navigate("/")
      return
    }
    api.defaults.headers.common["Authorization"] = bearer
  }, [navigate])

  // troca de agente = limpa estado local
  useEffect(() => {
    setSessionId(null)
    setMessages([])
    setFiles([])
  }, [assistantKey])

  // autoscroll
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading, showHistory])

  // ESC fecha modal
  useEffect(() => {
    if (!showHistory) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowHistory(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [showHistory])

  const openHistory = async () => {
    const bearer = buildBearer()
    if (!bearer) return
    try {
      const { data } = await api.get<{ sessions: Sessao[] }>(`/agentes/sessions`, {
        params: { assistantKey },
        headers: { Authorization: bearer },
      })
      setSessions(data.sessions || [])
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 401 || status === 403) {
        setAuthError("Sessão expirada. Faça login novamente.")
      } else {
        setSessions([])
      }
    } finally {
      setShowHistory(true)
    }
  }

  const reopenSession = async (id: string) => {
    const bearer = buildBearer()
    if (!bearer) return
    setLoading(true)
    try {
      const { data } = await api.get<{ sessionId: string; messages: Msg[] }>(`/agentes/session/${id}`, {
        headers: { Authorization: bearer },
      })
      setSessionId(data.sessionId)
      setMessages(data.messages || [])
      setShowHistory(false)
      setTimeout(() => {
        const el = listRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 0)
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 401 || status === 403) {
        setAuthError("Sessão expirada. Faça login novamente.")
      } else {
        const msg = e?.response?.data?.message || "Não foi possível abrir a sessão."
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: String(msg) }])
      }
    } finally {
      setLoading(false)
    }
  }

  const resizeTA = () => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = "0px"
    ta.style.height = Math.min(Math.max(ta.scrollHeight, 40), 220) + "px"
  }

  const triggerPick = () => fileInputRef.current?.click()

  const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const list = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...list].slice(0, 8))
    e.target.value = ""
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const send = async () => {
    const text = input.trim()
    if ((text === "" && files.length === 0) || loading) return

    const bearer = buildBearer()
    if (!bearer) {
      setAuthError("Sessão expirada. Faça login novamente.")
      return
    }

    const tmpId = crypto.randomUUID()
    if (text) setMessages(prev => [...prev, { id: tmpId, role: "user", content: text }])
    setInput("")
    resizeTA()

    setLoading(true)
    try {
      const form = new FormData()
      form.append("assistantKey", assistantKey)
      if (sessionId) form.append("sessionId", sessionId)
      form.append("content", text || " ")
      for (const f of files) form.append("files", f, f.name)

      const { data } = await api.post<{ sessionId: string; reply: Msg }>(
        `/agentes/messages`,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: bearer, // <- normalizado
          },
          transformRequest: [(d) => d],
        }
      )

      if (!sessionId) setSessionId(data.sessionId)
      setMessages(prev => [...prev, data.reply])
      setFiles([])
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        // NÃO redireciona; só avisa.
        setAuthError("Sessão expirada. Faça login novamente.")
      } else {
        const msg = err?.response?.data?.message || "Falha ao enviar. Tente novamente."
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: String(msg) }])
      }
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
      <MentoradoHeader />

      <div className="chat-toolbar">
        <div className="chat-toolbar-inner">
          <div className="agent-actions-left">
            <div className="agent-select">
              <label htmlFor="assistantKey">Agente</label>
              <select id="assistantKey" name="assistantKey" value={assistantKey} onChange={(e) => setAssistantKey(e.target.value)}>
                {ASSISTANTS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </div>

            <button className="btn-secondary" onClick={openHistory}>
              Histórico
            </button>
          </div>
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
            id="mensagem"
            name="mensagem"
            className="composer-input"
            placeholder="Pergunte qualquer coisa ou anexe uma imagem"
            value={input}
            onChange={(e) => { setInput(e.target.value); resizeTA() }}
            onKeyDown={onKeyDown}
            rows={1}
          />
          <input
            ref={fileInputRef}
            id="anexos"
            name="anexos"
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={onPickFiles}
          />
          <button className="btn-secondary" onClick={triggerPick} disabled={loading}>
            Anexar
          </button>
          <button className="composer-send" onClick={send} disabled={loading || (input.trim()==="" && files.length===0)}>
            Enviar
          </button>
        </div>
        {files.length > 0 && (
          <div className="files-row">
            {files.map((f, i) => (
              <div className="file-pill" key={i} title={f.name}>
                <span className="file-name">{f.name}</span>
                <button className="file-x" onClick={() => removeFile(i)} aria-label="Remover arquivo">×</button>
              </div>
            ))}
          </div>
        )}
        <p className="composer-hint">Enter envia • Shift+Enter quebra linha</p>
        {authError && <p className="msg-error" style={{ marginTop: 8 }}>{authError}</p>}
      </div>

      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)} role="dialog" aria-modal="true">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Sessões anteriores</div>
              <button
                className="modal-close"
                aria-label="Fechar histórico"
                title="Fechar"
                onClick={() => setShowHistory(false)}
              >
                <span aria-hidden>×</span>
              </button>
            </div>
            <div className="modal-body">
              {sessions.length === 0 ? (
                <div className="history-empty">Sem sessões para este agente.</div>
              ) : (
                <div className="sessions-grid">
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className="session-item"
                      onClick={() => reopenSession(s.id)}
                      aria-label={`Abrir sessão de ${new Date(s.lastMessageAt || s.createdAt).toLocaleString()}`}
                    >
                      <div className="session-top">
                        <span className="session-date">{new Date(s.lastMessageAt || s.createdAt).toLocaleString()}</span>
                        <span className="session-count">{s.totalMessages} msgs</span>
                      </div>
                      <div className="session-snippet">{s.lastSnippet || "(sem resumo)"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
