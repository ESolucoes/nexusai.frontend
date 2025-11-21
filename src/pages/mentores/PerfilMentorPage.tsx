import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import Header from "../../components/layout/Header"
import "../../styles/mentorados/perfil.css"
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
  updateMentorTipo,
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

  const [currentUser, setCurrentUser] = useState<{
    id?: string
    isAdmin: boolean
  }>({ id: undefined, isAdmin: false })

  const [usuario, setUsuario] = useState<{
    id?: string
    nome: string
    email: string
    telefone?: string | null
    avatarUrl?: string | null
    mentorTipo?: "admin" | "normal" | null
    mentorId?: string | null
  }>({ 
    id: undefined, 
    nome: "Carregando...", 
    email: "", 
    telefone: "", 
    avatarUrl: null, 
    mentorTipo: null,
    mentorId: null 
  })

  const [form, setForm] = useState({ 
    nome: "", 
    email: "", 
    telefone: "", 
    novaSenha: "",
    mentorTipo: "normal" as "admin" | "normal"
  })
  const [vigencias, setVigencias] = useState<Array<{ id: string; inicio: string; fim: string | null }>>([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Carregar dados do usuário atual
  useEffect(() => {
    const loadCurrentUser = async () => {
      const userId = pickUserIdFromJwt(getToken())
      if (!userId) return

      try {
        const userData = await getUsuarioById(userId)
        const isAdmin = userData.mentor?.tipo === "admin"
        setCurrentUser({ id: userId, isAdmin })
      } catch (err) {
        console.error("[PerfilMentor] erro ao carregar usuário atual:", err)
      }
    }
    loadCurrentUser()
  }, [])

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
          mentorId: (data as any).mentor?.id ?? null,
        })
        setForm({
          nome: data.nome ?? "",
          email: data.email ?? "",
          telefone: ((data as any).telefone ?? "") as string,
          novaSenha: "",
          mentorTipo: (data as any).mentor?.tipo ?? "normal"
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

  async function salvarTipoMentor() {
    if (!usuario.mentorId || !currentUser.isAdmin) {
      alert("Sem permissão para alterar tipo de mentor.")
      return
    }

    try {
      await updateMentorTipo(usuario.mentorId, { tipo: form.mentorTipo })
      setUsuario(prev => ({ ...prev, mentorTipo: form.mentorTipo }))
      alert("Tipo de mentor atualizado!")
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Falha ao atualizar tipo de mentor.")
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
    if (!usuario.id || !currentUser.isAdmin) {
      alert("Apenas mentores administradores podem excluir usuários.")
      return
    }

    if (!confirm("Tem certeza que deseja excluir DEFINITIVAMENTE este usuário?")) return
    try {
      await deleteUsuario(usuario.id)
      alert("Usuário excluído.")
      window.location.href = "/"
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Falha ao excluir usuário.")
    }
  }

  const podeExcluirUsuario = currentUser.isAdmin
  const podeEditarTipoMentor = currentUser.isAdmin && usuario.mentorId

  return (
    <div className="perfil-mentor-page">
      <Header />
      
      {/* CONTAINER COM SCROLL */}
      <div className="perfil-scroll-container">
        <div className="perfil-container">
          <div className="perfil-header">
            <div className="perfil-avatar-section">
              <img
                src={avatarSrc}
                alt="Usuário"
                className="perfil-avatar"
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
              <div className="perfil-user-info">
                <h1>{usuario.nome}</h1>
                <p>{usuario.email}</p>
                {usuario.telefone && <p className="perfil-telefone">{usuario.telefone}</p>}
                {usuario.mentorTipo && (
                  <span className={`perfil-badge ${usuario.mentorTipo}`}>
                    {usuario.mentorTipo === "admin" ? "Administrador" : "Mentor Normal"}
                  </span>
                )}
                {currentUser.isAdmin && (
                  <span className="perfil-badge admin" style={{ background: '#6f42c1' }}>
                    Você é Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="perfil-content">
            {/* SEÇÃO EDITAR USUÁRIO */}
            <div className="perfil-section">
              <h2>Editar Informações</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome Completo</label>
                  <input 
                    type="text" 
                    value={form.nome} 
                    onChange={e => setForm(s => ({ ...s, nome: e.target.value }))}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="form-group">
                  <label>E-mail</label>
                  <input 
                    type="email" 
                    value={form.email} 
                    onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="form-group">
                  <label>Telefone</label>
                  <input 
                    type="tel" 
                    value={form.telefone} 
                    onChange={e => setForm(s => ({ ...s, telefone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="form-group">
                  <label>Nova Senha (opcional)</label>
                  <input 
                    type="password" 
                    value={form.novaSenha} 
                    onChange={e => setForm(s => ({ ...s, novaSenha: e.target.value }))}
                    placeholder="Deixe em branco para manter a atual"
                  />
                </div>
              </div>
              <button className="btn-primary" onClick={salvarUsuario} disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>

            {/* SEÇÃO TIPO DE MENTOR (APENAS ADMINS) */}
            {podeEditarTipoMentor && (
              <div className="perfil-section">
                <h2>Tipo de Mentor</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Tipo de Acesso</label>
                    <select 
                      value={form.mentorTipo}
                      onChange={e => setForm(s => ({ ...s, mentorTipo: e.target.value as "admin" | "normal" }))}
                      className="mentor-type-select"
                    >
                      <option value="normal">Mentor Normal</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
                <button className="btn-primary" onClick={salvarTipoMentor}>
                  Atualizar Tipo de Mentor
                </button>
                <p className="form-help-text">
                  Apenas administradores podem alterar o tipo de mentor.
                </p>
              </div>
            )}

            {/* SEÇÃO VIGÊNCIA */}
            <div className="perfil-section">
              <h2>Gerenciar Vigência</h2>
              <div className="vigencia-status">
                <div className="status-info">
                  <strong>Status Atual:</strong>
                  <span className={`status-badge ${ativa ? "ativa" : "inativa"}`}>
                    {ativa ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <button className="btn-secondary" onClick={onToggleVigencia}>
                  {ativa ? "Desativar Vigência" : "Ativar Vigência"}
                </button>
              </div>

              {vigencias.length > 0 && (
                <div className="vigencia-list">
                  <h3>Histórico de Vigencias</h3>
                  {vigencias.map(v => (
                    <div key={v.id} className="vigencia-item">
                      <div className="vigencia-dates">
                        <div className="date-group">
                          <label>Início</label>
                          <input 
                            type="datetime-local" 
                            value={v.inicio.slice(0, 16)} 
                            onChange={e => setVigencias(arr => arr.map(x => x.id === v.id ? { ...x, inicio: e.target.value } : x))} 
                          />
                        </div>
                        <div className="date-group">
                          <label>Fim</label>
                          <input 
                            type="datetime-local" 
                            value={v.fim ? v.fim.slice(0, 16) : ""} 
                            onChange={e => setVigencias(arr => arr.map(x => x.id === v.id ? { ...x, fim: e.target.value || null } : x))} 
                          />
                        </div>
                      </div>
                      <button className="btn-small" onClick={() => salvarDatasVigencia(v)}>
                        Atualizar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!vigencias.length && (
                <div className="empty-state">
                  <p>Nenhuma vigência cadastrada ainda.</p>
                </div>
              )}
            </div>

            {/* SEÇÃO EXCLUIR CONTA (APENAS ADMINS) */}
            <div className="perfil-section danger-section">
              <h2>Zona de Perigo</h2>
              <div className="danger-content">
                <div className="warning-text">
                  <h3>Excluir Conta</h3>
                  <p>
                    {podeExcluirUsuario 
                      ? "Esta ação é irreversível. Todos os dados serão permanentemente removidos do sistema."
                      : "Apenas mentores administradores podem excluir usuários do sistema."
                    }
                  </p>
                </div>
                <button 
                  className={`btn-danger ${!podeExcluirUsuario ? 'btn-disabled' : ''}`} 
                  onClick={excluirUsuario}
                  disabled={!podeExcluirUsuario}
                >
                  {podeExcluirUsuario ? "Excluir Minha Conta" : "Sem Permissão"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <img src="/images/dashboard.png" alt="" className="perfil-bg-image" draggable={false} />
      </div>
    </div>
  )
}