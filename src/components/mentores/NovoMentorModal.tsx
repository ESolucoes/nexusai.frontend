import { useMemo, useState } from "react";
import { api } from "../../lib/api";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

function formatPhoneBR(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(
      /^(\d{0,2})(\d{0,4})(\d{0,4}).*/,
      (_: any, a: string, b: string, c: string) =>
        [a && `(${a}`, a && ") ", b, b && "-", c].filter(Boolean).join("")
    );
  }
  return digits.replace(
    /^(\d{0,2})(\d{0,5})(\d{0,4}).*/,
    (_: any, a: string, b: string, c: string) =>
      [a && `(${a}`, a && ") ", b, b && "-", c].filter(Boolean).join("")
  );
}

function combineDateWithNow(dateStr: string, now: Date, addSeconds = 0) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const local = new Date(
    y,
    (m ?? 1) - 1,
    d ?? 1,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );
  if (addSeconds > 0) local.setSeconds(local.getSeconds() + addSeconds);
  return local.toISOString();
}

async function ativarVigencia(usuarioId: string) {
  try {
    await api.patch(`/vigencias/${usuarioId}/switch`, { ativo: true });
  } catch {}
}

export default function NovoMentorModal({ onClose, onSuccess }: Props) {
  const [m_nome, setM_Nome] = useState("");
  const [m_email, setM_Email] = useState("");
  const [m_telefone, setM_Telefone] = useState("");
  const [m_senha, setM_Senha] = useState("");
  const [m_mostrarSenha, setM_MostrarSenha] = useState(false);
  const [m_inicioVig, setM_InicioVig] = useState("");
  const [m_fimVig, setM_FimVig] = useState("");
  const [m_isAdmin, setM_IsAdmin] = useState(false);
  const [m_loading, setM_Loading] = useState(false);
  const [m_msg, setM_Msg] = useState<string | null>(null);
  const [m_err, setM_Err] = useState<string | null>(null);

  const m_emailValido = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m_email.trim()), [m_email]);
  const m_nomeValido = useMemo(() => m_nome.trim().length >= 3, [m_nome]);
  const m_senhaValida = useMemo(() => (m_senha?.trim().length ?? 0) >= 8, [m_senha]);
  const m_telefoneValido = useMemo(() => m_telefone.replace(/\D/g, "").length >= 10, [m_telefone]);
  const m_inicioValido = useMemo(() => Boolean(m_inicioVig), [m_inicioVig]);

  async function submitNovoMentor(e: React.FormEvent) {
    e.preventDefault();
    if (m_loading) return;
    setM_Msg(null);
    setM_Err(null);
    if (!m_nomeValido) return setM_Err("Informe um nome válido (mín. 3 caracteres).");
    if (!m_emailValido) return setM_Err("Informe um e-mail válido.");
    if (!m_telefoneValido) return setM_Err("Informe um telefone válido.");
    if (!m_senhaValida) return setM_Err("A senha deve ter pelo menos 8 caracteres.");
    if (!m_inicioValido) return setM_Err("Selecione o início da vigência.");
    setM_Loading(true);
    try {
      const now = new Date();
      const inicioISO = combineDateWithNow(m_inicioVig, now, 30);
      let fimISO: string | null = null;
      if (m_fimVig) {
        const temp = new Date(combineDateWithNow(m_fimVig, now));
        const inicioDate = new Date(inicioISO);
        if (temp < inicioDate) temp.setTime(inicioDate.getTime() + 1000);
        fimISO = temp.toISOString();
      }
      const { data: usuarioCriado } = await api.post("/usuarios", {
        nome: m_nome.trim(),
        email: m_email.trim(),
        telefone: m_telefone.replace(/\D/g, ""),
        senha: m_senha.trim(),
      });
      const vigPayload: any = { email: usuarioCriado.email, inicio: inicioISO };
      if (fimISO) vigPayload.fim = fimISO;
      await api.post("/vigencias", vigPayload);
      await ativarVigencia(usuarioCriado.id);
      await api.post("/mentores", {
        usuarioId: usuarioCriado.id,
        tipo: m_isAdmin ? "admin" : "normal",
      });
      setM_Msg("Mentor cadastrado com sucesso!");
      setTimeout(() => {
        onSuccess();
      }, 700);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || "Não foi possível concluir o cadastro do mentor.";
      setM_Err(String(msg));
    } finally {
      setM_Loading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Registrar Mentor</h3>
          <button className="modal-close" onClick={() => !m_loading && onClose()}>×</button>
        </div>
        <form className="modal-form" onSubmit={submitNovoMentor} noValidate>
          <div className="grid-2">
            <div className="form-group">
              <label>Nome</label>
              <input type="text" placeholder="Nome completo" value={m_nome} onChange={(e) => setM_Nome(e.target.value)} disabled={m_loading} required />
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input type="email" placeholder="email@exemplo.com" value={m_email} onChange={(e) => setM_Email(e.target.value)} disabled={m_loading} required />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Telefone</label>
              <input type="tel" inputMode="tel" placeholder="(00) 00000-0000" value={m_telefone} onChange={(e) => setM_Telefone(formatPhoneBR(e.target.value))} disabled={m_loading} required />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <div className="password-row">
                <input type={m_mostrarSenha ? "text" : "password"} autoComplete="new-password" placeholder="Mínimo de 8 caracteres" value={m_senha} onChange={(e) => setM_Senha(e.target.value)} disabled={m_loading} required />
                <a href="#" onClick={(e) => { e.preventDefault(); setM_MostrarSenha((v) => !v); }} className="toggle-pass">
                  {m_mostrarSenha ? "Ocultar" : "Mostrar"}
                </a>
              </div>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Início da vigência</label>
              <input type="date" value={m_inicioVig} onChange={(e) => setM_InicioVig(e.target.value)} disabled={m_loading} required />
            </div>
            <div className="form-group">
              <label>Fim da vigência (opcional)</label>
              <input type="date" value={m_fimVig} onChange={(e) => setM_FimVig(e.target.value)} disabled={m_loading} />
            </div>
          </div>
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Tipo de conta</label>
            <div className="radio-row">
              <label>
                <input type="radio" name="tipoMentor" value="normal" checked={!m_isAdmin} onChange={() => setM_IsAdmin(false)} disabled={m_loading} /> Normal
              </label>
              <label>
                <input type="radio" name="tipoMentor" value="admin" checked={m_isAdmin} onChange={() => setM_IsAdmin(true)} disabled={m_loading} /> Administrador
              </label>
            </div>
          </div>
          <div aria-live="polite" className="msg-area">
            {m_msg && <p className="msg-success">{m_msg}</p>}
            {m_err && <p className="msg-error">{m_err}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn outline" onClick={() => !m_loading && onClose()}>Cancelar</button>
            <button type="submit" className="btn primary" disabled={m_loading || !m_nomeValido || !m_emailValido || !m_telefoneValido || !m_senhaValida || !m_inicioValido}>
              {m_loading ? "Cadastrando…" : "Cadastrar Mentor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}