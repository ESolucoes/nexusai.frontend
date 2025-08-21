import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import '../../styles/autenticacao/login.css'

type CriarUsuarioBody = {
  nome: string
  email: string
  telefone: string
  senha: string
}

type CriarUsuarioResponse = {
  id: string
  nome: string
  email: string
  telefone: string
  criadoEm: string
  atualizadoEm: string
}

type CriarVigenciaBody = {
  email: string
  inicio: string
  fim?: string | null
}

type CriarVigenciaResponse = {
  id: string
  usuarioId: string
  inicio: string
  fim?: string | null
  criadoEm: string
  atualizadoEm: string
}

type CriarMentorBody = {
  usuarioId: string
  tipo: 'admin' | 'normal'
}

type CriarMentorResponse = {
  id: string
  usuarioId: string
  tipo: 'admin' | 'normal'
  criadoEm: string
  atualizadoEm: string
}

function formatPhoneBR(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
      [a && `(${a}`, a && ') ', b, b && '-', c].filter(Boolean).join(''),
    )
  }
  return digits.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/, (_, a, b, c) =>
    [a && `(${a}`, a && ') ', b, b && '-', c].filter(Boolean).join(''),
  )
}

export default function RegisterMentorPage() {
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const [inicioVigencia, setInicioVigencia] = useState('')
  const [fimVigencia, setFimVigencia] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add('login-bg')
    return () => document.body.classList.remove('login-bg')
  }, [])

  const emailValido = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email])
  const nomeValido = useMemo(() => nome.trim().length >= 3, [nome])
  const senhaValida = useMemo(() => (senha?.trim().length ?? 0) >= 8, [senha])
  const telefoneValido = useMemo(() => telefone.replace(/\D/g, '').length >= 10, [telefone])
  const inicioValido = useMemo(() => Boolean(inicioVigencia), [inicioVigencia])

  function combineDateWithNow(dateStr: string, now: Date, addSeconds = 0) {
    const [y, m, d] = dateStr.split('-').map(Number)
    const local = new Date(
      y,
      (m ?? 1) - 1,
      d ?? 1,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds(),
    )
    if (addSeconds > 0) local.setSeconds(local.getSeconds() + addSeconds)
    return local.toISOString()
  }

  const cadastrarMentor = useMutation({
    mutationFn: async () => {
      const now = new Date()
      const inicioISO = combineDateWithNow(inicioVigencia, now, 30)
      let fimISO: string | null = null
      if (fimVigencia) {
        const temp = new Date(combineDateWithNow(fimVigencia, now))
        const inicioDate = new Date(inicioISO)
        if (temp < inicioDate) temp.setTime(inicioDate.getTime() + 1000)
        fimISO = temp.toISOString()
      }

      const { data: usuario } = await api.post<CriarUsuarioResponse>('/usuarios', {
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.replace(/\D/g, ''),
        senha: senha.trim(),
      } as CriarUsuarioBody)

      const vigenciaPayload: CriarVigenciaBody = { email: usuario.email, inicio: inicioISO }
      if (fimISO) vigenciaPayload.fim = fimISO
      await api.post<CriarVigenciaResponse>('/vigencias', vigenciaPayload)

      await api.post<CriarMentorResponse>('/mentores', {
        usuarioId: usuario.id,
        tipo: isAdmin ? 'admin' : 'normal',
      } as CriarMentorBody)

      return true
    },
    onSuccess: () => {
      setErro(null)
      setMensagem('Mentor cadastrado com sucesso!')
      setTimeout(() => navigate('/'), 1200)
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        'Não foi possível concluir o cadastro do mentor.'
      setMensagem(null)
      setErro(String(msg))
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMensagem(null)
    setErro(null)
    if (!nomeValido) return setErro('Informe um nome válido (mín. 3 caracteres).')
    if (!emailValido) return setErro('Informe um e-mail válido.')
    if (!telefoneValido) return setErro('Informe um telefone válido.')
    if (!senhaValida) return setErro('A senha deve ter pelo menos 8 caracteres.')
    if (!inicioValido) return setErro('Selecione o início da vigência.')
    if (cadastrarMentor.isPending) return
    cadastrarMentor.mutate()
  }

  return (
    <div className="login-wrapper">
      <div className="login-sidebar">
        <h1 className="login-title">Registrar Mentor</h1>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="nome">Nome</label>
            <input
              id="nome"
              type="text"
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={cadastrarMentor.isPending}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={cadastrarMentor.isPending}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefone">Telefone</label>
            <input
              id="telefone"
              type="tel"
              inputMode="tel"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
              disabled={cadastrarMentor.isPending}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Mínimo de 8 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={cadastrarMentor.isPending}
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

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="inicio">Início da vigência</label>
              <input
                id="inicio"
                type="date"
                value={inicioVigencia}
                onChange={(e) => setInicioVigencia(e.target.value)}
                disabled={cadastrarMentor.isPending}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="fim">Fim da vigência (opcional)</label>
              <input
                id="fim"
                type="date"
                value={fimVigencia}
                onChange={(e) => setFimVigencia(e.target.value)}
                disabled={cadastrarMentor.isPending}
              />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Tipo de conta</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                id="tipo-normal"
                type="radio"
                name="tipo"
                value="normal"
                checked={!isAdmin}
                onChange={() => setIsAdmin(false)}
                disabled={cadastrarMentor.isPending}
              />
              <label htmlFor="tipo-normal" style={{ userSelect: 'none' }}>Normal</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                id="tipo-admin"
                type="radio"
                name="tipo"
                value="admin"
                checked={isAdmin}
                onChange={() => setIsAdmin(true)}
                disabled={cadastrarMentor.isPending}
              />
              <label htmlFor="tipo-admin" style={{ userSelect: 'none' }}>Administrador</label>
            </div>
          </div>

          <div aria-live="polite" style={{ minHeight: 18 }}>
            {mensagem && <p className="msg-success">{mensagem}</p>}
            {erro && <p className="msg-error">{erro}</p>}
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={
              cadastrarMentor.isPending ||
              !nomeValido ||
              !emailValido ||
              !telefoneValido ||
              !senhaValida ||
              !inicioValido
            }
          >
            {cadastrarMentor.isPending ? 'Cadastrando…' : 'Cadastrar Mentor'}
          </button>
        </form>
      </div>
    </div>
  )
}
