import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import '../../styles/autenticacao/login.css'

type SolicitarCodigoBody = { email: string }
type SolicitarCodigoResponse = {
  email: string
  codigo: string
  expiraEm: string
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add('login-bg')
    return () => document.body.classList.remove('login-bg')
  }, [])

  const emailValido = useMemo(() => {
    const v = email.trim().toLowerCase()
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  }, [email])

  const solicitarCodigo = useMutation({
    mutationFn: async (payload: SolicitarCodigoBody) => {
      const { data } = await api.post<SolicitarCodigoResponse>(
        '/autenticacao/senha/solicitar-codigo',
        payload
      )
      return data
    },
    onSuccess: (data) => {
      setErro(null)
      setMensagem('Código enviado! Redirecionando…')
      navigate('/change-password', { state: { email: data.email } })
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        'Não foi possível enviar o código. Tente novamente.'
      setMensagem(null)
      setErro(String(msg))
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMensagem(null)
    setErro(null)

    const normalized = email.trim().toLowerCase()
    if (!normalized || !emailValido) {
      setErro('Informe um e-mail válido.')
      return
    }

    if (solicitarCodigo.isPending) return
    solicitarCodigo.mutate({ email: normalized })
  }

  return (
    <div className="login-wrapper">
      <div className="login-sidebar">
        <h1 className="login-title">Redefinir Senha</h1>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={solicitarCodigo.isPending}
              aria-invalid={!!erro && !mensagem}
              aria-describedby={erro ? 'email-erro' : undefined}
              required
            />
          </div>

          <div aria-live="polite" style={{ minHeight: 18 }}>
            {mensagem && <p className="msg-success">{mensagem}</p>}
            {erro && <p id="email-erro" className="msg-error">{erro}</p>}
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={!emailValido || solicitarCodigo.isPending}
          >
            {solicitarCodigo.isPending ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      </div>
    </div>
  )
}
