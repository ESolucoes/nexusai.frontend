import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { api, setToken, decodeJwt, getToken, clearToken } from "../../lib/api"
import "../../styles/autenticacao/login.css"

type LoginResponse = { access_token?: string; token?: string; jwt?: string }

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

      const headerAuth = res.headers.get("authorization") || res.headers.get("Authorization")
      if (headerAuth) {
        setToken(headerAuth)
        return { access_token: headerAuth.replace(/^Bearer\s+/i, "") }
      }

      const data = (await res.clone().json().catch(() => ({}))) as LoginResponse
      const token = data.access_token || data.token || data.jwt
      if (!token) throw new Error("Token não retornado pelo servidor.")
      setToken(token)
      return { access_token: token }
    },
    onSuccess: async (payload) => {
      setErro(null)
      try {
        const dec = decodeJwt<any>(payload.access_token!)
        const usuarioId: string =
          dec?.sub || dec?.id || dec?.userId || dec?.uid || dec?.usuarioId
        if (!usuarioId) throw new Error("Token sem ID de usuário.")

        const { data: lista } = await api.get(`/mentores?usuarioId=${usuarioId}`)
        const ehMentor = Array.isArray(lista) ? lista.length > 0 : Boolean(lista?.items?.length)
        if (!ehMentor) {
          setErro("Apenas usuários mentores podem acessar o dashboard.")
          clearToken()
          return
        }

        navigate("/dashboard/mentores")
      } catch (e: any) {
        setErro(e?.message || "Erro ao validar perfil de mentor.")
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
