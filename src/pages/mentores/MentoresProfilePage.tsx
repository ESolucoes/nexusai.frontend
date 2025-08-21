import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import Header from "../../components/layout/Header"
import "../../styles/mentores/dashboard.css"
import { api, getToken } from "../../lib/api"

type Vigencia = {
  ativo?: boolean | null
  inicio?: string | null
  fim?: string | null
}

type UsuarioResponse = {
  id: string
  nome: string
  email: string
  telefone?: string | null
  mentor?: { id?: string; tipo?: "admin" | "normal" | string } | null
}

function decodeJwt<T = any>(token?: string | null): T | null {
  if (!token) return null
  try {
    const base = token.split(".")[1]
    const padded = base.padEnd(base.length + ((4 - (base.length % 4)) % 4), "=")
    const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export default function MentoresProfilePage() {
  const { usuarioId } = useParams<{ usuarioId: string }>()
  const navigate = useNavigate()

  const [isSelf, setIsSelf] = useState(false)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<UsuarioResponse | null>(null)
  const [vigencias, setVigencias] = useState<Vigencia[]>([])
  const [vigenciaAtiva, setVigenciaAtiva] = useState<boolean | null>(null)

  useEffect(() => {
    document.body.classList.remove("login-bg")
    document.body.classList.add("no-scroll")
    return () => document.body.classList.remove("no-scroll")
  }, [])

  useEffect(() => {
    if (!usuarioId) return
    const token = getToken?.()
    const payload = decodeJwt<any>(token)
    const uid = payload?.sub || payload?.id || payload?.userId || payload?.uid || payload?.usuarioId
    if (uid && String(uid) === String(usuarioId)) {
      setIsSelf(true)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setErro(null)

    Promise.all([
      api.get<UsuarioResponse>(`/usuarios/${usuarioId}`, { signal: controller.signal as any }).then(r => r.data),
      api.get<Vigencia[]>(`/vigencias/${usuarioId}`, { signal: controller.signal as any }).then(r => r.data).catch(() => [] as Vigencia[]),
    ])
      .then(([u, v]) => {
        setUsuario(u)
        setVigencias(Array.isArray(v) ? v : [])
        const ativa = Array.isArray(v) && v.some(it => it && (it.fim == null || String(it.fim).trim() === ""))
        setVigenciaAtiva(ativa)
      })
      .catch((e: any) => {
        const d = e?.response?.data
        const msg =
          (Array.isArray(d?.message) ? d.message.join(" | ") : d?.message) ||
          d?.error || e?.message || "Erro ao carregar perfil"
        setErro(String(msg))
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [usuarioId, navigate])

  if (isSelf) {
    return (
      <div className="mentores-dashboard">
        <Header />
        <div style={{ padding: "24px" }}>
          <h1>Perfil</h1>
          <p>Este é o seu usuário. Em breve esta rota levará para a página de perfil próprio.</p>
        </div>
        <img src="/images/dashboard.png" alt="" className="dashboard-center-image" draggable={false} />
      </div>
    )
  }

  return (
    <div className="mentores-dashboard">
      <Header />

      <div className="page-title" style={{ padding: "0 24px", marginTop: 20, marginBottom: 12 }}>
        <h1>Perfil do Mentor</h1>
      </div>

      <div style={{ padding: "0 24px 24px" }}>
        {loading && <div>Carregando…</div>}
        {erro && !loading && <div style={{ color: "#991b1b", fontWeight: 700 }}>{erro}</div>}
        {!loading && !erro && usuario && (
          <div className="profile-card glass" style={{ padding: 16, borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <img src="/images/avatar.png" alt={usuario.nome} className="mentor-avatar" draggable={false} />
              <div>
                <h2 style={{ margin: 0 }}>{usuario.nome}</h2>
                <p style={{ margin: 0, opacity: 0.85 }}>{usuario.email}</p>
                {usuario.telefone && <p style={{ margin: 0, opacity: 0.85 }}>{usuario.telefone}</p>}
                <p style={{ marginTop: 8, fontWeight: 700 }}>
                  Tipo: {String(usuario.mentor?.tipo ?? "").toLowerCase() === "admin" ? "Admin" : "Normal"}
                </p>
                <p style={{ margin: 0 }}>
                  Vigência ativa:{" "}
                  <b style={{ color: vigenciaAtiva ? "#16a34a" : "#b91c1c" }}>
                    {vigenciaAtiva ? "Sim" : "Não"}
                  </b>
                </p>
              </div>
            </div>

            {vigencias.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ marginBottom: 8 }}>Vigências</h3>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {vigencias.map((v, i) => (
                    <li key={i}>
                      Início: {v.inicio ?? "-"} &nbsp;|&nbsp; Fim: {v.fim ?? "—"} &nbsp;|&nbsp; Ativo: {v.ativo ? "Sim" : "Não"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <img src="/images/dashboard.png" alt="" className="dashboard-center-image" draggable={false} />
    </div>
  )
}
