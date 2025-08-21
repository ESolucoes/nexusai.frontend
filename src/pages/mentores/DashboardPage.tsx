import { useEffect, useMemo, useState } from "react";
import Header from "../../components/layout/Header";
import "../../styles/mentores/dashboard.css";
import { api, getToken } from "../../lib/api";
import MentoresTable from "../../components/mentores/MentoresTable";
import MentoradosTable from "../../components/mentores/MentoradosTable";

type UsuarioResponse = {
  id: string;
  nome: string;
  email: string;
  mentor?: { id?: string; tipo?: "admin" | "normal" | string };
};

type CountResponse = { total: number };

type MentorUsuarioListItem = {
  id: string;
  usuarioId: string;
  nome: string;
  email: string;
};

function decodeJwt<T = any>(token?: string | null): T | null {
  if (!token) return null;
  try {
    const base = token.split(".")[1];
    const padded = base.padEnd(base.length + ((4 - (base.length % 4)) % 4), "=");
    const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

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

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<{ nome: string; email: string; tipoConta: "admin" | "normal" }>({
    nome: "Carregando...",
    email: "",
    tipoConta: "normal",
  });
  const [totalMentores, setTotalMentores] = useState<number>(0);
  const [totalMentorados, setTotalMentorados] = useState<number>(0);
  const [tabela, setTabela] = useState<"mentores" | "mentorados">("mentores");

  const [showMentorModal, setShowMentorModal] = useState(false);
  const [showMentoradoModal, setShowMentoradoModal] = useState(false);

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

  const [mentores, setMentores] = useState<MentorUsuarioListItem[]>([]);
  const [mentoresCarregando, setMentoresCarregando] = useState(false);
  const [mentoresErro, setMentoresErro] = useState<string | null>(null);

  const [refreshMentoresKey, setRefreshMentoresKey] = useState(0);
  const [refreshMentoradosKey, setRefreshMentoradosKey] = useState(0);

  useEffect(() => {
    document.body.classList.remove("login-bg");
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const token = getToken();
      if (!token) {
        setUsuario({ nome: "Usuário", email: "", tipoConta: "normal" });
        return;
      }
      const payload = decodeJwt<any>(token);
      const userId = payload?.sub || payload?.id || payload?.userId || payload?.uid || payload?.usuarioId;
      if (!userId) {
        setUsuario({ nome: "Usuário", email: "", tipoConta: "normal" });
        return;
      }
      try {
        const { data } = await api.get<UsuarioResponse>(`/usuarios/${userId}`, {
          signal: controller.signal as any,
        });
        const tipo = (data.mentor?.tipo?.toLowerCase?.() as "admin" | "normal") ?? "normal";
        setUsuario({
          nome: data.nome || "Usuário",
          email: data.email || "",
          tipoConta: tipo === "admin" ? "admin" : "normal",
        });
      } catch {
        setUsuario({ nome: "Usuário", email: "", tipoConta: "normal" });
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { data } = await api.get<CountResponse>(`/usuarios/mentores/count`, {
          signal: controller.signal as any,
        });
        setTotalMentores(data.total ?? 0);
      } catch {
        setTotalMentores(0);
      }
    })();
    return () => controller.abort();
  }, [refreshMentoresKey]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { data } = await api.get<CountResponse>(`/usuarios/mentorados/count`, {
          signal: controller.signal as any,
        });
        setTotalMentorados(data.total ?? 0);
      } catch {
        setTotalMentorados(0);
      }
    })();
    return () => controller.abort();
  }, [refreshMentoradosKey]);

  useEffect(() => {
    if (showMentoradoModal) void loadMentores();
  }, [showMentoradoModal]);

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
      setMentoresErro(
        e?.response?.data?.message || e?.response?.data?.error || "Não foi possível carregar a lista de mentores."
      );
      setMentores([]);
    } finally {
      setMentoresCarregando(false);
    }
  }

  async function ativarVigencia(usuarioId: string) {
    try {
      await api.patch(`/vigencias/${usuarioId}/switch`, { ativo: true });
    } catch {}
  }

  function onChangeMentor(mentorId: string) {
    setD_SelectedMentorId(mentorId);
    setD_MentorId(mentorId);
  }

  const badgeClass = usuario.tipoConta === "admin" ? "dashboard-badge badge--admin" : "dashboard-badge badge--normal";
  const badgeLabel = usuario.tipoConta === "admin" ? "Admin" : "Normal";

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
      setRefreshMentoresKey((v) => v + 1);
      try {
        const { data } = await api.get<CountResponse>(`/usuarios/mentores/count`);
        setTotalMentores(data.total ?? 0);
      } catch {}
      setTimeout(() => {
        setShowMentorModal(false);
        setM_Msg(null);
        setM_Err(null);
        setM_Loading(false);
        setM_Nome("");
        setM_Email("");
        setM_Telefone("");
        setM_Senha("");
        setM_InicioVig("");
        setM_FimVig("");
        setM_IsAdmin(false);
      }, 900);
      return;
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.response?.data?.error || "Não foi possível concluir o cadastro do mentor.";
      setM_Err(String(msg));
    } finally {
      setM_Loading(false);
    }
  }

  const d_emailValido = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d_email.trim()), [d_email]);
  const d_nomeValido = useMemo(() => d_nome.trim().length >= 3, [d_nome]);
  const d_senhaValida = useMemo(() => (d_senha?.trim().length ?? 0) >= 8, [d_senha]);
  const d_telefoneValido = useMemo(() => d_telefone.replace(/\D/g, "").length >= 10, [d_telefone]);
  const d_inicioValido = useMemo(() => Boolean(d_inicioVig), [d_inicioVig]);
  const d_dataNascValida = useMemo(() => /^\d{4}-\d{2}-\d{2}$/.test(d_dataNascimento), [d_dataNascimento]);

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
      setRefreshMentoradosKey((v) => v + 1);
      try {
        const { data } = await api.get<CountResponse>(`/usuarios/mentorados/count`);
        setTotalMentorados(data.total ?? 0);
      } catch {}
      setTimeout(() => {
        setShowMentoradoModal(false);
        setD_Msg(null);
        setD_Err(null);
        setD_Loading(false);
        setD_Nome("");
        setD_Email("");
        setD_Telefone("");
        setD_Senha("");
        setD_InicioVig("");
        setD_FimVig("");
        setD_SelectedMentorId("");
        setD_MentorId("");
        setD_Tipo("Executive");
        setD_Rg("");
        setD_Cpf("");
        setD_NomePai("");
        setD_NomeMae("");
        setD_DataNascimento("");
        setD_Rua("");
        setD_Numero("");
        setD_Complemento("");
        setD_Cep("");
        setD_CargoObjetivo("");
        setD_PretClt("");
        setD_PretPj("");
        setD_Linkedin("");
      }, 900);
      return;
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.response?.data?.error || "Não foi possível concluir o cadastro do mentorado.";
      setD_Err(String(msg));
    } finally {
      setD_Loading(false);
    }
  }

  return (
    <div className="mentores-dashboard">
      <Header />
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <img src="/images/avatar.png" alt="Usuário" className="dashboard-avatar" draggable={false} />
          <div className="dashboard-user-info">
            <h2>{usuario.nome}</h2>
            <p>{usuario.email}</p>
          </div>
          <span className={badgeClass}>{badgeLabel}</span>
        </div>
        <div className="mentores-count-card">
          <h2 className="mentores-count-number">{totalMentores}</h2>
          <p className="mentores-count-label">Mentores Registrados</p>
        </div>
        <div className="mentorados-count-card">
          <h2 className="mentorados-count-number">{totalMentorados}</h2>
          <p className="mentorados-count-label">Mentorados Registrados</p>
        </div>
        <div className="actions-panel">
          <button className="action-btn primary" onClick={() => setShowMentorModal(true)}>
            Novo Mentor
          </button>
          <button className="action-btn primary" onClick={() => setShowMentoradoModal(true)}>
            Novo Mentorado
          </button>
        </div>
      </div>
      <div className="mentores-table-wrapper">
        <div className="tabela-toggle">
          <button className={`toggle-btn ${tabela === "mentores" ? "active" : ""}`} onClick={() => setTabela("mentores")}>
            Mentores
          </button>
          <button className={`toggle-btn ${tabela === "mentorados" ? "active" : ""}`} onClick={() => setTabela("mentorados")}>
            Mentorados
          </button>
        </div>
        {tabela === "mentores" ? (
          <MentoresTable refreshKey={refreshMentoresKey} />
        ) : (
          <MentoradosTable refreshKey={refreshMentoradosKey} showMentorColumn enableVigenciaSwitch />
        )}
      </div>
      <img src="/images/dashboard.png" alt="" className="dashboard-center-image" draggable={false} />

      {showMentorModal && (
        <div className="modal-overlay" onClick={() => !m_loading && setShowMentorModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registrar Mentor</h3>
              <button className="modal-close" onClick={() => !m_loading && setShowMentorModal(false)}>
                ×
              </button>
            </div>
            <form className="modal-form" onSubmit={submitNovoMentor} noValidate>
              <div className="grid-2">
                <div className="form-group">
                  <label>Nome</label>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={m_nome}
                    onChange={(e) => setM_Nome(e.target.value)}
                    disabled={m_loading}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={m_email}
                    onChange={(e) => setM_Email(e.target.value)}
                    disabled={m_loading}
                    required
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="(00) 00000-0000"
                    value={m_telefone}
                    onChange={(e) => setM_Telefone(formatPhoneBR(e.target.value))}
                    disabled={m_loading}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Senha</label>
                  <div className="password-row">
                    <input
                      type={m_mostrarSenha ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Mínimo de 8 caracteres"
                      value={m_senha}
                      onChange={(e) => setM_Senha(e.target.value)}
                      disabled={m_loading}
                      required
                    />
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setM_MostrarSenha((v) => !v);
                      }}
                      className="toggle-pass"
                    >
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
                <button type="button" className="btn outline" onClick={() => !m_loading && setShowMentorModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={m_loading || !m_nomeValido || !m_emailValido || !m_telefoneValido || !m_senhaValida || !m_inicioValido}
                >
                  {m_loading ? "Cadastrando…" : "Cadastrar Mentor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMentoradoModal && (
        <div className="modal-overlay" onClick={() => !d_loading && setShowMentoradoModal(false)}>
          <div className="modal-card large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registrar Mentorado</h3>
              <button className="modal-close" onClick={() => !d_loading && setShowMentoradoModal(false)}>
                ×
              </button>
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
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="(00) 00000-0000"
                    value={d_telefone}
                    onChange={(e) => setD_Telefone(formatPhoneBR(e.target.value))}
                    disabled={d_loading}
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Senha</label>
                  <div className="password-row">
                    <input type={d_mostrarSenha ? "text" : "password"} placeholder="Mínimo de 8 caracteres" value={d_senha} onChange={(e) => setD_Senha(e.target.value)} disabled={d_loading} required />
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setD_MostrarSenha((v) => !v);
                      }}
                      className="toggle-pass"
                    >
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
                <button type="button" className="btn outline" onClick={() => !d_loading && setShowMentoradoModal(false)}>
                  Cancelar
                </button>
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
      )}
    </div>
  );
}
