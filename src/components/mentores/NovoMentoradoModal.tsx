import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

type MentorUsuarioListItem = {
  id: string;
  usuarioId: string;
  nome: string;
  email: string;
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

export default function NovoMentoradoModal({ onClose, onSuccess }: Props) {
  const [mentores, setMentores] = useState<MentorUsuarioListItem[]>([]);
  const [mentoresCarregando, setMentoresCarregando] = useState(false);
  const [mentoresErro, setMentoresErro] = useState<string | null>(null);

  const [d_nome, setD_Nome] = useState("");
  const [d_email, setD_Email] = useState("");
  const [d_telefone, setD_Telefone] = useState("");
  const [d_senha, setD_Senha] = useState("");
  const [d_mostrarSenha, setD_MostrarSenha] = useState(false);
  const [d_inicioVig, setD_InicioVig] = useState("");
  const [d_fimVig, setD_FimVig] = useState("");

  const [d_selectedMentorId, setD_SelectedMentorId] = useState("");
  const [d_mentorId, setD_MentorId] = useState("");

  const [d_tipo, setD_Tipo] = useState<"Executive" | "First Class">("Executive");

  const [d_rg, setD_Rg] = useState("");
  const [d_cpf, setD_Cpf] = useState("");
  const [d_nomePai, setD_NomePai] = useState("");
  const [d_nomeMae, setD_NomeMae] = useState("");
  const [d_dataNascimento, setD_DataNascimento] = useState("");
  const [d_rua, setD_Rua] = useState("");
  const [d_numero, setD_Numero] = useState("");
  const [d_complemento, setD_Complemento] = useState("");
  const [d_cep, setD_Cep] = useState("");
  const [d_cargoObjetivo, setD_CargoObjetivo] = useState("");
  const [d_pretClt, setD_PretClt] = useState<number | string>("");
  const [d_pretPj, setD_PretPj] = useState<number | string>("");
  const [d_linkedin, setD_Linkedin] = useState("");

  const [d_loading, setD_Loading] = useState(false);
  const [d_msg, setD_Msg] = useState<string | null>(null);
  const [d_err, setD_Err] = useState<string | null>(null);

  const d_emailValido = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d_email.trim()), [d_email]);
  const d_nomeValido = useMemo(() => d_nome.trim().length >= 3, [d_nome]);
  const d_senhaValida = useMemo(() => (d_senha?.trim().length ?? 0) >= 8, [d_senha]);
  const d_telefoneValido = useMemo(() => d_telefone.replace(/\D/g, "").length >= 10, [d_telefone]);
  const d_inicioValido = useMemo(() => Boolean(d_inicioVig), [d_inicioVig]);
  const d_dataNascValida = useMemo(() => /^\d{4}-\d{2}-\d{2}$/.test(d_dataNascimento), [d_dataNascimento]);

  function onChangeMentor(mentorId: string) {
    setD_SelectedMentorId(mentorId);
    setD_MentorId(mentorId);
  }

  async function loadMentores() {
    setMentoresCarregando(true);
    setMentoresErro(null);
    try {
      const { data } = await api.get<{ items: MentorUsuarioListItem[]; meta?: any }>(`/usuarios/mentores?limit=200&page=1`);
      const arr = Array.isArray((data as any)?.items) ? (data as any).items : [];
      setMentores(arr);
      if (d_selectedMentorId && !arr.some((m: MentorUsuarioListItem) => m.id === d_selectedMentorId)) {
        setD_SelectedMentorId("");
        setD_MentorId("");
      }
    } catch (e: any) {
      setMentoresErro(e?.response?.data?.message || e?.response?.data?.error || "Não foi possível carregar a lista de mentores.");
      setMentores([]);
    } finally {
      setMentoresCarregando(false);
    }
  }

  useEffect(() => {
    loadMentores();
  }, []);

  async function submitNovoMentorado(e: React.FormEvent) {
    e.preventDefault();
    if (d_loading) return;
    setD_Msg(null);
    setD_Err(null);
    if (!d_nomeValido) return setD_Err("Informe um nome válido (mín. 3 caracteres).");
    if (!d_emailValido) return setD_Err("Informe um e-mail válido.");
    if (!d_telefoneValido) return setD_Err("Informe um telefone válido.");
    if (!d_senhaValida) return setD_Err("A senha deve ter pelo menos 8 caracteres.");
    if (!d_inicioValido) return setD_Err("Selecione o início da vigência.");
    if (!d_mentorId.trim()) return setD_Err("Selecione o mentor.");
    if (!d_rg.trim()) return setD_Err("Informe o RG.");
    if (!d_cpf.trim()) return setD_Err("Informe o CPF.");
    if (!d_nomePai.trim()) return setD_Err("Informe o nome do pai.");
    if (!d_nomeMae.trim()) return setD_Err("Informe o nome da mãe.");
    if (!d_dataNascValida) return setD_Err("Informe a data de nascimento no formato YYYY-MM-DD.");
    if (!d_rua.trim()) return setD_Err("Informe a rua.");
    if (!d_numero.trim()) return setD_Err("Informe o número.");
    if (!d_cep.trim()) return setD_Err("Informe o CEP.");
    if (String(d_pretClt).trim() === "" || String(d_pretPj).trim() === "") return setD_Err("Informe as pretensões CLT e PJ.");
    setD_Loading(true);
    try {
      const now = new Date();
      const inicioISO = combineDateWithNow(d_inicioVig, now, 30);
      let fimISO: string | null = null;
      if (d_fimVig) {
        const temp = new Date(combineDateWithNow(d_fimVig, now));
        const inicioDate = new Date(inicioISO);
        if (temp < inicioDate) temp.setTime(inicioDate.getTime() + 1000);
        fimISO = temp.toISOString();
      }
      const { data: usuarioCriado } = await api.post("/usuarios", {
        nome: d_nome.trim(),
        email: d_email.trim(),
        telefone: d_telefone.replace(/\D/g, ""),
        senha: d_senha.trim(),
      });
      const vigPayload: any = { email: usuarioCriado.email, inicio: inicioISO };
      if (fimISO) vigPayload.fim = fimISO;
      await api.post("/vigencias", vigPayload);
      await ativarVigencia(usuarioCriado.id);
      await api.post("/mentorados", {
        usuarioId: usuarioCriado.id,
        mentorId: d_mentorId.trim(),
        tipo: d_tipo,
        rg: d_rg.trim(),
        cpf: d_cpf.trim(),
        nomePai: d_nomePai.trim(),
        nomeMae: d_nomeMae.trim(),
        dataNascimento: d_dataNascimento.trim(),
        rua: d_rua.trim(),
        numero: d_numero.trim(),
        complemento: d_complemento.trim() || null,
        cep: d_cep.trim(),
        cargoObjetivo: d_cargoObjetivo.trim(),
        pretensaoClt: Number(d_pretClt),
        pretensaoPj: Number(d_pretPj),
        linkedin: d_linkedin.trim(),
      });
      setD_Msg("Mentorado cadastrado com sucesso!");
      setTimeout(() => {
        onSuccess();
      }, 700);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || "Não foi possível concluir o cadastro do mentorado.";
      setD_Err(String(msg));
    } finally {
      setD_Loading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !d_loading && onClose()}>
      <div className="modal-card large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Registrar Mentorado</h3>
          <button className="modal-close" onClick={() => !d_loading && onClose()}>×</button>
        </div>
        <form className="modal-form" onSubmit={submitNovoMentorado} noValidate>
          <h4 className="section-title">Dados do usuário</h4>
          <div className="grid-3">
            <div className="form-group">
              <label>Nome</label>
              <input type="text" placeholder="Nome completo" value={d_nome} onChange={(e) => setD_Nome(e.target.value)} disabled={d_loading} required />
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input type="email" placeholder="email@exemplo.com" value={d_email} onChange={(e) => setD_Email(e.target.value)} disabled={d_loading} required />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input type="tel" inputMode="tel" placeholder="(00) 00000-0000" value={d_telefone} onChange={(e) => setD_Telefone(formatPhoneBR(e.target.value))} disabled={d_loading} required />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Senha</label>
              <div className="password-row">
                <input type={d_mostrarSenha ? "text" : "password"} placeholder="Mínimo de 8 caracteres" value={d_senha} onChange={(e) => setD_Senha(e.target.value)} disabled={d_loading} required />
                <a href="#" onClick={(e) => { e.preventDefault(); setD_MostrarSenha((v) => !v); }} className="toggle-pass">
                  {d_mostrarSenha ? "Ocultar" : "Mostrar"}
                </a>
              </div>
            </div>
            <div />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Início da vigência</label>
              <input type="date" value={d_inicioVig} onChange={(e) => setD_InicioVig(e.target.value)} disabled={d_loading} required />
            </div>
            <div className="form-group">
              <label>Fim da vigência (opcional)</label>
              <input type="date" value={d_fimVig} onChange={(e) => setD_FimVig(e.target.value)} disabled={d_loading} />
            </div>
          </div>

          <h4 className="section-title">Vínculo e perfil</h4>
          <div className="grid-3">
            <div className="form-group">
              <label>Mentor</label>
              <select value={d_selectedMentorId} onChange={(e) => onChangeMentor(e.target.value)} disabled={d_loading || mentoresCarregando} required>
                <option value="">{mentoresCarregando ? "Carregando mentores…" : "Selecione um mentor"}</option>
                {mentores.map((m: MentorUsuarioListItem) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} — {m.email}
                  </option>
                ))}
              </select>
              {mentoresErro && <small style={{ color: "#991b1b", fontWeight: 700 }}>{mentoresErro}</small>}
              {!mentoresCarregando && !mentoresErro && mentores.length === 0 && (
                <small style={{ color: "#334155", fontWeight: 700 }}>Nenhum mentor encontrado.</small>
              )}
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select value={d_tipo} onChange={(e) => setD_Tipo(e.target.value as "Executive" | "First Class")} disabled={d_loading}>
                <option value="Executive">Executive</option>
                <option value="First Class">First Class</option>
              </select>
            </div>
            <div className="form-group">
              <label>Data de Nascimento</label>
              <input type="date" value={d_dataNascimento} onChange={(e) => setD_DataNascimento(e.target.value)} disabled={d_loading} required />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label>RG</label>
              <input type="text" value={d_rg} onChange={(e) => setD_Rg(e.target.value)} disabled={d_loading} required />
            </div>
            <div className="form-group">
              <label>CPF</label>
              <input type="text" value={d_cpf} onChange={(e) => setD_Cpf(e.target.value)} disabled={d_loading} required />
            </div>
            <div className="form-group">
              <label>LinkedIn (opcional)</label>
              <input type="url" placeholder="https://linkedin.com/in/usuario" value={d_linkedin} onChange={(e) => setD_Linkedin(e.target.value)} disabled={d_loading} />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Nome do Pai</label>
              <input type="text" value={d_nomePai} onChange={(e) => setD_NomePai(e.target.value)} disabled={d_loading} required />
            </div>
            <div className="form-group">
              <label>Nome da Mãe</label>
              <input type="text" value={d_nomeMae} onChange={(e) => setD_NomeMae(e.target.value)} disabled={d_loading} required />
            </div>
          </div>

          <h4 className="section-title">Endereço</h4>
          <div className="grid-4">
            <div className="form-group">
              <label>Rua</label>
              <input type="text" value={d_rua} onChange={(e) => setD_Rua(e.target.value)} disabled={d_loading} required />
            </div>
            <div className="form-group">
              <label>Número</label>
              <input type="text" value={d_numero} onChange={(e) => setD_Numero(e.target.value)} disabled={d_loading} required />
            </div>
            <div className="form-group">
              <label>Complemento (opcional)</label>
              <input type="text" value={d_complemento} onChange={(e) => setD_Complemento(e.target.value)} disabled={d_loading} />
            </div>
            <div className="form-group">
              <label>CEP</label>
              <input type="text" value={d_cep} onChange={(e) => setD_Cep(e.target.value)} disabled={d_loading} required />
            </div>
          </div>

          <h4 className="section-title">Profissional</h4>
          <div className="grid-3">
            <div className="form-group">
              <label>Cargo Objetivo</label>
              <input type="text" value={d_cargoObjetivo} onChange={(e) => setD_CargoObjetivo(e.target.value)} disabled={d_loading} />
            </div>
            <div className="form-group">
              <label>Pretensão CLT (R$)</label>
              <input type="number" inputMode="numeric" value={d_pretClt} onChange={(e) => setD_PretClt(e.target.value)} disabled={d_loading} required />
            </div>
            <div className="form-group">
              <label>Pretensão PJ (R$)</label>
              <input type="number" inputMode="numeric" value={d_pretPj} onChange={(e) => setD_PretPj(e.target.value)} disabled={d_loading} required />
            </div>
          </div>

          <div aria-live="polite" className="msg-area">
            {d_msg && <p className="msg-success">{d_msg}</p>}
            {d_err && <p className="msg-error">{d_err}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn outline" onClick={() => !d_loading && onClose()}>Cancelar</button>
            <button
              type="submit"
              className="btn primary"
              disabled={
                d_loading ||
                !d_nomeValido ||
                !d_emailValido ||
                !d_telefoneValido ||
                !d_senhaValida ||
                !d_inicioValido ||
                !d_dataNascValida ||
                !d_mentorId.trim() ||
                !d_rg.trim() ||
                !d_cpf.trim() ||
                !d_nomePai.trim() ||
                !d_nomeMae.trim() ||
                !d_rua.trim() ||
                !d_numero.trim() ||
                !d_cep.trim() ||
                String(d_pretClt).trim() === "" ||
                String(d_pretPj).trim() === ""
              }
            >
              {d_loading ? "Cadastrando…" : "Cadastrar Mentorado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
