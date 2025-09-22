import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { api, setToken, decodeJwt, getToken, clearToken } from "../../lib/api"
import "../../styles/autenticacao/login.css"

type LoginResponse = { access_token?: string; token?: string; jwt?: string }

function pickUserIdFromJwt(jwt?: string | null): string | null {
  const p = decodeJwt<any>(jwt)
  const candidates = [
    p?.sub,
    p?.id,
    p?.userId,
    p?.uid,
    p?.usuarioId,
    p?.user_id,
    typeof p?.user === "object" ? p.user?.id : undefined,
  ]
  const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0)
  return found ? String(found) : null
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add("login-bg")
    return () => document.body.classList.remove("login-bg")
  }, [])

  useEffect(() => {
    const t = getToken()
    if (!t) return
    const payload = decodeJwt<any>(t)
    const exp = payload?.exp
    if (exp && Math.floor(Date.now() / 1000) >= exp) {
      clearToken()
    }
  }, [])

  async function descobrirPerfil(usuarioId: string) {
    // 1) tenta diretamente no /usuarios/{id}
    try {
      const { data } = await api.get<any>(`/usuarios/${usuarioId}`)
      const ehMentor = Boolean(data?.mentor?.tipo || data?.mentor?.id)
      const ehMentorado = Boolean(data?.mentorado?.id || data?.mentorado)
      if (ehMentor) return "mentor"
      if (ehMentorado) return "mentorado"
    } catch {}
    // 2) fallback: lista de mentores
    try {
      const { data: mentores } = await api.get<any>(`/usuarios/mentores`)
      const ehMentorLista = Array.isArray(mentores)
        ? mentores.some((m: any) => m?.usuarioId === usuarioId || m?.id === usuarioId)
        : Array.isArray(mentores?.items) &&
          mentores.items.some((m: any) => m?.usuarioId === usuarioId || m?.id === usuarioId)
      if (ehMentorLista) return "mentor"
    } catch {}
    // 3) fallback: lista de mentorados
    try {
      const { data: mentorados } = await api.get<any>(`/usuarios/mentorados`)
      const ehMentoradoLista = Array.isArray(mentorados)
        ? mentorados.some((m: any) => m?.usuarioId === usuarioId || m?.id === usuarioId)
        : Array.isArray(mentorados?.items) &&
          mentorados.items.some((m: any) => m?.usuarioId === usuarioId || m?.id === usuarioId)
      if (ehMentoradoLista) return "mentorado"
    } catch {}
    return "desconhecido"
  }

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${api.defaults.baseURL}/autenticacao/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, senha }),
      })
      if (!res.ok) {
        const tx = await res.text()
        throw new Error(tx || `HTTP ${res.status}`)
      }

      // tenta Authorization header primeiro
      const headerAuth = res.headers.get("authorization") || res.headers.get("Authorization")
      if (headerAuth) {
        setToken(headerAuth) // salva normalizado (sem "Bearer ")
        return { access_token: headerAuth.replace(/^Bearer\s+/i, "") }
      }

      // fallback: corpo JSON
      const data = (await res.clone().json().catch(() => ({}))) as LoginResponse
      const token = data.access_token || data.token || data.jwt
      if (!token) throw new Error("Token não retornado pelo servidor.")
      setToken(token)
      return { access_token: token }
    },
    onSuccess: async (payload) => {
      setErro(null)
      try {
        const usuarioId = pickUserIdFromJwt(payload.access_token!)
        if (!usuarioId) throw new Error("Token sem ID de usuário.")
        const perfil = await descobrirPerfil(usuarioId)
        if (perfil === "mentor") {
          navigate("/dashboard/mentores")
          return
        }
        if (perfil === "mentorado") {
          navigate("/dashboard/mentorado")
          return
        }
        setErro("Perfil não autorizado para acesso.")
        clearToken()
      } catch (e: any) {
        setErro(e?.message || "Erro ao validar perfil.")
        clearToken()
      }
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Falha no login."
      setErro(String(msg))
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (loginMutation.isPending) return
    loginMutation.mutate()
  }

  return (
    <div className="login-wrapper">
      <div className="login-sidebar">
        <h1 className="login-title">Acesso</h1>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loginMutation.isPending}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={loginMutation.isPending}
              required
            />
          </div>
          <a href="/forgot-password" className="forgot-password">Esqueceu a senha?</a>
          {erro && <p className="msg-error">{erro}</p>}
          <button type="submit" className="login-submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Entrando…" : "Entrar"}
          </button>
          <div className="stay-connected">
            <label><input type="checkbox" /> Mantenha-se conectado</label>
          </div>
        </form>
      </div>
    </div>
  )
}
