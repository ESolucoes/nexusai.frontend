import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import '../../styles/autenticacao/login.css'

type RedefinirSenhaBody = {
  codigo: string
  novaSenha: string
}

type RedefinirSenhaResponse = {
  sucesso: boolean
}

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const location = useLocation() as unknown as { state?: { email?: string } }

  const [codigo, setCodigo] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add('login-bg')
    return () => document.body.classList.remove('login-bg')
  }, [])

  const codigoValido = useMemo(() => /^\d{6}$/.test(codigo.trim()), [codigo])
  const senhaValida = useMemo(() => (novaSenha?.trim().length ?? 0) >= 8, [novaSenha])

  const redefinirSenha = useMutation({
    mutationFn: async (payload: RedefinirSenhaBody) => {
      const { data } = await api.post<RedefinirSenhaResponse>(
        '/autenticacao/senha/redefinir',
        payload
      )
      return data
    },
    onSuccess: () => {
      setErro(null)
      setMensagem('Senha alterada com sucesso! Você já pode entrar.')
      setTimeout(() => navigate('/'), 1200)
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        'Não foi possível alterar a senha. Verifique o código e tente novamente.'
      setMensagem(null)
      setErro(String(msg))
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMensagem(null)
    setErro(null)

    if (!codigoValido) {
      setErro('Informe o código de 6 dígitos.')
      return
    }
    if (!senhaValida) {
      setErro('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }

    if (redefinirSenha.isPending) return
    redefinirSenha.mutate({
      codigo: codigo.trim(),
      novaSenha: novaSenha.trim(),
    })
  }

  return (
    <div className="login-wrapper">
      <div className="login-sidebar">
        <h1 className="login-title">Mudar Senha</h1>

        {location?.state?.email && (
          <p className="login-subtitle">
            Enviamos um código para <strong>{location.state.email}</strong>
          </p>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="codigo">Código</label>
            <input
              id="codigo"
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              placeholder="Digite o código de 6 dígitos"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              disabled={redefinirSenha.isPending}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="novaSenha">Nova senha</label>
            <input
              id="novaSenha"
              type={mostrarSenha ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Digite a nova senha (mín. 8 caracteres)"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              disabled={redefinirSenha.isPending}
              required
            />
          </div>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setMostrarSenha((v) => !v)
            }}
            className="forgot-password"
          >
            {mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
          </a>

          <div aria-live="polite" style={{ minHeight: 18 }}>
            {mensagem && <p className="msg-success">{mensagem}</p>}
            {erro && <p className="msg-error">{erro}</p>}
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={!codigoValido || !senhaValida || redefinirSenha.isPending}
          >
            {redefinirSenha.isPending ? 'Alterando…' : 'Mudar senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
