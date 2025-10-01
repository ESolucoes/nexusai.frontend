import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import Header from "../../components/layout/Header"
import "../../styles/mentorados/home.css"
import {
  api,
  getToken,
  pickUserIdFromJwt,
  getUsuarioById,
  updateUsuario,
  deleteUsuario,
  listVigenciasPorUsuario,
  toggleVigencia,
  updateVigencia,
} from "../../lib/api"

function resolveImageUrl(u?: string | null): string | null {
  if (!u) return null
  if (/^https?:\/\//i.test(u)) return u
  const base = (api?.defaults?.baseURL || "").replace(/\/+$/, "")
  const path = String(u).replace(/^\/+/, "")
  if (!base) return `/${path}`
  return `${base}/${path}`
}

function cacheBust(u?: string | null): string | null {
  if (!u) return u ?? null
  const sep = u.includes("?") ? "&" : "?"
  return `${u}${sep}t=${Date.now()}`
}

export default function PerfilMentorPage() {
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const usuarioIdQuery = queryParams.get("usuarioId")

  const [usuario, setUsuario] = useState<{
    id?: string
    nome: string
    email: string
    telefone?: string | null
    avatarUrl?: string | null
    mentorTipo?: "admin" | "normal" | null
  }>({ id: undefined, nome: "Carregando...", email: "", telefone: "", avatarUrl: null, mentorTipo: null })

  const [form, setForm] = useState({ nome: "", email: "", telefone: "", novaSenha: "" })
  const [vigencias, setVigencias] = useState<Array<{ id: string; inicio: string; fim: string | null }>>([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    document.body.classList.remove("login-bg")
    document.body.classList.add("no-scroll")
    return () => document.body.classList.remove("no-scroll")
  }, [])

  useEffect(() => {
    ;(async () => {
      let userId: string | null = usuarioIdQuery ?? pickUserIdFromJwt(getToken())

      if (!userId) {
        setUsuario((p) => ({ ...p, nome: "Usuário", email: "" }))
        return
      }

      try {
        const data = await getUsuarioById(userId)
        setUsuario({
          id: data.id,
          nome: data.nome ?? "Usuário",
          email: data.email ?? "",
          telefone: (data as any).telefone ?? "",
          avatarUrl: resolveImageUrl(data.avatarUrl) ?? null,
          mentorTipo: (data as any).mentor?.tipo ?? null,
        })
        setForm({
          nome: data.nome ?? "",
          email: data.email ?? "",
          telefone: ((data as any).telefone ?? "") as string,
          novaSenha: "",
        })
        const vigs = await listVigenciasPorUsuario(userId)
        setVigencias(vigs.map(v => ({ id: v.id, inicio: String(v.inicio), fim: v.fim ? String(v.fim) : null })))
      } catch (err) {
        console.error("[PerfilMentor] carregar falhou:", err)
      }
    })()
  }, [usuarioIdQuery])

  const avatarFallback = "/images/avatar.png"
  const avatarSrc = usuario.avatarUrl?.trim() ? usuario.avatarUrl! : avatarFallback

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!usuario.id) return
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append("file", file)
    try {
      const { data } = await api.post(`/usuarios/${usuario.id}/avatar`, formData)
      if (data?.url) {
        const absolute = resolveImageUrl(String(data.url))
        const busted = cacheBust(absolute)
        setUsuario((prev) => ({ ...prev, avatarUrl: busted || absolute || data.url }))
      }
    } catch (err) {
      console.error("[PerfilMentor] upload avatar falhou:", err)
    } finally {
      if (e.currentTarget) e.currentTarget.value = ""
    }
  }

  async function salvarUsuario() {
    if (!usuario.id) return
    setLoading(true)
    try {
      await updateUsuario(usuario.id, {
        nome: form.nome?.trim(),
        email: form.email?.trim(),
        telefone: form.telefone?.trim(),
        novaSenha: form.novaSenha?.trim() || undefined,
      })
      alert("Dados atualizados!")
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Falha ao atualizar usuário.")
    } finally {
      setLoading(false)
    }
  }

  const ativa = vigencias.find(v => v.fim === null) || null

  async function onToggleVigencia() {
    if (!usuario.id) return
    try {
      const res = await toggleVigencia(usuario.id, !ativa)
      const vigs = await listVigenciasPorUsuario(usuario.id)
      setVigencias(vigs.map(v => ({ id: v.id, inicio: String(v.inicio), fim: v.fim ? String(v.fim) : null })))
      alert(`Vigência ${res.status}.`)
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Falha ao alternar vigência.")
    }
  }

  async function salvarDatasVigencia(v: { id: string; inicio: string; fim: string | null }) {
    try {
      await updateVigencia(v.id, { inicio: v.inicio, fim: v.fim })
      alert("Vigência atualizada!")
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Falha ao atualizar vigência.")
    }
  }

  async function excluirUsuario() {
    if (!usuario.id) return
    if (!confirm("Tem certeza que deseja excluir DEFINITIVAMENTE este usuário?")) return
    try {
      await deleteUsuario(usuario.id)
      alert("Usuário excluído.")
      window.location.href = "/"
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Falha ao excluir usuário.")
    }
  }

  return (
    <div className="mentorados-home">
      <div className="mentorados-scroll" style={{ height: "100vh", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" }}>
        <Header />

        <div className="mentorados-cards">
          {/* CARD USUÁRIO (avatar + nome/email) */}
          <div className="mentorados-card">
            <img
              src={avatarSrc}
              alt="Usuário"
              className="mentorados-avatar"
              draggable={false}
              onClick={() => fileInputRef.current?.click()}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement
                if (img.src !== window.location.origin + avatarFallback && img.src !== avatarFallback) {
                  img.src = avatarFallback
                }
              }}
            />
            <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleAvatarChange} />
            <div className="mentorados-user-info">
              <h2>{usuario.nome}</h2>
              <p>{usuario.email}</p>
            </div>
          </div>

          {/* EDITAR USUÁRIO */}
          <div className="mentorados-card" style={{ background: "#fff", color: "#0f172a" }}>
            <div style={{ width: "100%" }}>
              <h3 style={{ marginTop: 0 }}>Editar Usuário</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input placeholder="Nome" value={form.nome} onChange={e => setForm(s => ({ ...s, nome: e.target.value }))} />
                <input placeholder="E-mail" value={form.email} onChange={e => setForm(s => ({ ...s, email: e.target.value }))} />
                <input placeholder="Telefone" value={form.telefone} onChange={e => setForm(s => ({ ...s, telefone: e.target.value }))} />
                <input placeholder="Nova senha (opcional)" type="password" value={form.novaSenha} onChange={e => setForm(s => ({ ...s, novaSenha: e.target.value }))} />
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="cv-upload-btn" onClick={salvarUsuario} disabled={loading}>Salvar</button>
              </div>
            </div>
          </div>

          {/* VIGÊNCIA */}
          <div className="mentorados-card" style={{ background: "#fff", color: "#0f172a" }}>
            <div style={{ width: "100%" }}>
              <h3 style={{ marginTop: 0 }}>Vigência</h3>
              <div style={{ marginBottom: 8 }}>
                <strong>Status:</strong> {ativa ? "Ativa" : "Inativa"}
                <button className="cv-upload-btn" style={{ marginLeft: 10 }} onClick={onToggleVigencia}>
                  {ativa ? "Desativar" : "Ativar agora"}
                </button>
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto", borderTop: "1px solid #eee", paddingTop: 8 }}>
                {vigencias.map(v => (
                  <div key={v.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <label style={{ fontSize: 12, color: "#555" }}>Início</label>
                    <label style={{ fontSize: 12, color: "#555" }}>Fim</label>
                    <span />
                    <input type="datetime-local" value={v.inicio.slice(0, 16)} onChange={e => setVigencias(arr => arr.map(x => x.id === v.id ? { ...x, inicio: e.target.value } : x))} />
                    <input type="datetime-local" value={v.fim ? v.fim.slice(0, 16) : ""} onChange={e => setVigencias(arr => arr.map(x => x.id === v.id ? { ...x, fim: e.target.value || null } : x))} />
                    <button className="cv-upload-btn" onClick={() => salvarDatasVigencia(v)}>Salvar</button>
                  </div>
                ))}
                {!vigencias.length && <div style={{ color: "#666", fontSize: 14 }}>Nenhuma vigência cadastrada ainda.</div>}
              </div>
            </div>
          </div>

          {/* MENTOR */}
          <div className="mentorados-card" style={{ background: "#fff", color: "#0f172a" }}>
            <div style={{ width: "100%" }}>
              <h3 style={{ marginTop: 0 }}>Mentor</h3>
              <p style={{ margin: 0 }}>Tipo: <strong>{usuario.mentorTipo ?? "—"}</strong></p>
              <small style={{ color: "#666" }}>Obs.: alteração do tipo requer o ID do mentor; a API atual não expõe o id pelo usuário.</small>
            </div>
          </div>

          {/* EXCLUIR USUÁRIO */}
          <div className="mentorados-card" style={{ background: "#fff", color: "#b00020" }}>
            <div style={{ width: "100%" }}>
              <h3 style={{ marginTop: 0, color: "#b00020" }}>Excluir Usuário</h3>
              <p style={{ marginTop: 0, color: "#7a0015" }}>Esta ação é irreversível.</p>
              <button className="cv-upload-btn" onClick={excluirUsuario}>Excluir</button>
            </div>
          </div>
        </div>

        <img src="/images/dashboard.png" alt="" className="mentorados-center-image" draggable={false} />
      </div>
    </div>
  )
}
