import { useEffect, useRef, useState } from "react"
import MentoradoHeader from "../../components/layout/MentoradoHeader"
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
  updateMentorado,
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

export default function PerfilMentoradoPage() {
  const [usuario, setUsuario] = useState<{
    id?: string
    nome: string
    email: string
    telefone?: string | null
    avatarUrl?: string | null
    mentoradoId?: string | null
    accountType: "Executive" | "First Class" | null
  }>({ id: undefined, nome: "Carregando...", email: "", telefone: "", avatarUrl: null, mentoradoId: null, accountType: null })

  const [userForm, setUserForm] = useState({ nome: "", email: "", telefone: "", novaSenha: "" })

  // Form PutMentoradoDto
  const [mentForm, setMentForm] = useState({
    tipo: "" as "Executive" | "First Class" | "",
    rg: "", cpf: "", nomePai: "", nomeMae: "",
    dataNascimento: "", rua: "", numero: "", complemento: "", cep: "",
    cargoObjetivo: "", pretensaoClt: "", pretensaoPj: "", linkedin: "",
  })

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
      const jwt = getToken()
      const userId = pickUserIdFromJwt(jwt)
      if (!jwt || !userId) {
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
          mentoradoId: data.mentorado?.id ?? null,
          accountType: (data.mentorado?.tipo as any) ?? null,
        })
        setUserForm({
          nome: data.nome ?? "",
          email: data.email ?? "",
          telefone: ((data as any).telefone ?? "") as string,
          novaSenha: "",
        })
        // Pré-preenche mentorado
        const md: any = data.mentorado || {}
        setMentForm({
          tipo: (md.tipo as any) || "",
          rg: md.rg || "", cpf: md.cpf || "", nomePai: md.nomePai || "", nomeMae: md.nomeMae || "",
          dataNascimento: md.dataNascimento || "",
          rua: md.rua || "", numero: md.numero || "", complemento: md.complemento || "", cep: md.cep || "",
          cargoObjetivo: md.cargoObjetivo || "",
          pretensaoClt: md.pretensaoClt || "", pretensaoPj: md.pretensaoPj || "",
          linkedin: md.linkedin || "",
        })
        const vigs = await listVigenciasPorUsuario(userId)
        setVigencias(vigs.map(v => ({ id: v.id, inicio: String(v.inicio), fim: v.fim ? String(v.fim) : null })))
      } catch (err) {
        console.error("[PerfilMentorado] carregar falhou:", err)
      }
    })()
  }, [])

  const avatarFallback = "/images/avatar.png"
  const avatarSrc = usuario.avatarUrl?.trim() ? usuario.avatarUrl! : avatarFallback
  const badgeClass =
    usuario.accountType === "Executive" ? "mentorados-badge badge--executive"
    : usuario.accountType === "First Class" ? "mentorados-badge badge--firstclass"
    : "mentorados-badge hidden"

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
      console.error("[PerfilMentorado] upload avatar falhou:", err)
    } finally {
      if (e.currentTarget) e.currentTarget.value = ""
    }
  }

  async function salvarUsuario() {
    if (!usuario.id) return
    setLoading(true)
    try {
      await updateUsuario(usuario.id, {
        nome: userForm.nome?.trim(),
        email: userForm.email?.trim(),
        telefone: userForm.telefone?.trim(),
        novaSenha: userForm.novaSenha?.trim() || undefined,
      })
      alert("Dados atualizados!")
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Falha ao atualizar usuário.")
    } finally {
      setLoading(false)
    }
  }

  async function salvarMentorado() {
    if (!usuario.mentoradoId) {
      alert("Mentorado ainda não vinculado a este usuário.")
      return
    }
    try {
      await updateMentorado(usuario.mentoradoId, {
        tipo: mentForm.tipo || undefined,
        rg: mentForm.rg || undefined,
        cpf: mentForm.cpf || undefined,
        nomePai: mentForm.nomePai || undefined,
        nomeMae: mentForm.nomeMae || undefined,
        dataNascimento: mentForm.dataNascimento || undefined,
        rua: mentForm.rua || undefined,
        numero: mentForm.numero || undefined,
        complemento: mentForm.complemento || undefined,
        cep: mentForm.cep || undefined,
        cargoObjetivo: mentForm.cargoObjetivo || undefined,
        pretensaoClt: mentForm.pretensaoClt ? Number(mentForm.pretensaoClt) : undefined,
        pretensaoPj: mentForm.pretensaoPj ? Number(mentForm.pretensaoPj) : undefined,
        linkedin: mentForm.linkedin || undefined,
      })
      alert("Dados de mentorado atualizados!")
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Falha ao atualizar mentorado.")
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
        <MentoradoHeader />

        <div className="mentorados-cards">
          {/* CARD DO USUÁRIO */}
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
            <span className={badgeClass}>{usuario.accountType ?? ""}</span>
          </div>

          {/* EDITAR USUÁRIO */}
          <div className="mentorados-card" style={{ background: "#fff", color: "#0f172a" }}>
            <div style={{ width: "100%" }}>
              <h3 style={{ marginTop: 0 }}>Editar Usuário</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input placeholder="Nome" value={userForm.nome} onChange={e => setUserForm(s => ({ ...s, nome: e.target.value }))} />
                <input placeholder="E-mail" value={userForm.email} onChange={e => setUserForm(s => ({ ...s, email: e.target.value }))} />
                <input placeholder="Telefone" value={userForm.telefone} onChange={e => setUserForm(s => ({ ...s, telefone: e.target.value }))} />
                <input placeholder="Nova senha (opcional)" type="password" value={userForm.novaSenha} onChange={e => setUserForm(s => ({ ...s, novaSenha: e.target.value }))} />
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="cv-upload-btn" onClick={salvarUsuario} disabled={loading}>Salvar</button>
              </div>
            </div>
          </div>

          {/* MENTORADO */}
          <div className="mentorados-card" style={{ background: "#fff", color: "#0f172a" }}>
            <div style={{ width: "100%" }}>
              <h3 style={{ marginTop: 0 }}>Mentorado</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <select value={mentForm.tipo} onChange={e => setMentForm(s => ({ ...s, tipo: e.target.value as any }))}>
                  <option value="">— Tipo —</option>
                  <option value="Executive">Executive</option>
                  <option value="First Class">First Class</option>
                </select>
                <input placeholder="Cargo Objetivo" value={mentForm.cargoObjetivo} onChange={e => setMentForm(s => ({ ...s, cargoObjetivo: e.target.value }))} />
                <input placeholder="RG" value={mentForm.rg} onChange={e => setMentForm(s => ({ ...s, rg: e.target.value }))} />
                <input placeholder="CPF" value={mentForm.cpf} onChange={e => setMentForm(s => ({ ...s, cpf: e.target.value }))} />
                <input type="date" placeholder="Data de Nascimento" value={mentForm.dataNascimento} onChange={e => setMentForm(s => ({ ...s, dataNascimento: e.target.value }))} />
                <input placeholder="LinkedIn (URL)" value={mentForm.linkedin} onChange={e => setMentForm(s => ({ ...s, linkedin: e.target.value }))} />
                <input placeholder="Rua" value={mentForm.rua} onChange={e => setMentForm(s => ({ ...s, rua: e.target.value }))} />
                <input placeholder="Número" value={mentForm.numero} onChange={e => setMentForm(s => ({ ...s, numero: e.target.value }))} />
                <input placeholder="Complemento" value={mentForm.complemento} onChange={e => setMentForm(s => ({ ...s, complemento: e.target.value }))} />
                <input placeholder="CEP" value={mentForm.cep} onChange={e => setMentForm(s => ({ ...s, cep: e.target.value }))} />
                <input placeholder="Pretensão CLT" value={mentForm.pretensaoClt} onChange={e => setMentForm(s => ({ ...s, pretensaoClt: e.target.value }))} />
                <input placeholder="Pretensão PJ" value={mentForm.pretensaoPj} onChange={e => setMentForm(s => ({ ...s, pretensaoPj: e.target.value }))} />
                <input placeholder="Nome do Pai" value={mentForm.nomePai} onChange={e => setMentForm(s => ({ ...s, nomePai: e.target.value }))} />
                <input placeholder="Nome da Mãe" value={mentForm.nomeMae} onChange={e => setMentForm(s => ({ ...s, nomeMae: e.target.value }))} />
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="cv-upload-btn" onClick={salvarMentorado} disabled={!usuario.mentoradoId}>Salvar</button>
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
