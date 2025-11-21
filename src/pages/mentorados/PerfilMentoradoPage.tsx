// frontend/src/pages/mentorados/PerfilMentoradoPage.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import MentoradoHeader from "../../components/layout/MentoradoHeader";
import "../../styles/mentorados/perfil.css";
import {
  api,
  getToken,
  pickUserIdFromJwt,
  getUsuarioById,
  updateUsuario,
  updateMentorado,
  getMentoradoById,
  listVigenciasPorUsuario,
  updateVigencia,
  toggleVigencia,
  deleteUsuario,
} from "../../lib/api";

// Adiciona a definição local do tipo
type VigenciaDto = {
  id: string;
  usuarioId: string;
  inicio: string;
  fim: string | null;
};

// Adiciona tipo para usuário
type Usuario = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  avatarUrl: string | null;
  mentoradoId: string | null;
  accountType: string | null;
  isMentor: boolean;
};

function resolveImageUrl(u?: string | null): string | null {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  const base = (api?.defaults?.baseURL || "").replace(/\/+$/, "");
  const path = String(u).replace(/^\/+/, "");
  if (!base) return `/${path}`;
  return `${base}/${path}`;
}

function cacheBust(u?: string | null): string | null {
  if (!u) return u ?? null;
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}t=${Date.now()}`;
}

export default function PerfilMentoradoPage() {
  const [search] = useSearchParams();
  const location = useLocation() as any;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [usuario, setUsuario] = useState<Usuario>({
    id: "",
    nome: "Carregando...",
    email: "",
    telefone: "",
    avatarUrl: null,
    mentoradoId: null,
    accountType: null,
    isMentor: false,
  });

  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);

  const [userForm, setUserForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    novaSenha: "",
  });

  const [mentForm, setMentForm] = useState({
    tipo: "" as "Executive" | "First Class" | "",
    rg: "",
    cpf: "",
    nomePai: "",
    nomeMae: "",
    dataNascimento: "",
    rua: "",
    numero: "",
    complemento: "",
    cep: "",
    cargoObjetivo: "",
    pretensaoClt: "",
    pretensaoPj: "",
    linkedin: "",
  });

  const [vigencias, setVigencias] = useState<VigenciaDto[]>([]);
  const [vigenciaEditando, setVigenciaEditando] = useState<string | null>(null);
  const [vigenciaForm, setVigenciaForm] = useState<{
    inicio: string;
    fim: string;
  }>({ inicio: "", fim: "" });

  const [loading, setLoading] = useState(false);
  const [loadingVigencias, setLoadingVigencias] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    document.body.classList.remove("login-bg");
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, []);

  // Carregar dados do usuário atual (logado)
  useEffect(() => {
    const loadCurrentUser = async () => {
      const jwt = getToken();
      const userId = pickUserIdFromJwt(jwt);
      if (!jwt || !userId) return;

      try {
        const data = await getUsuarioById(userId);
        setCurrentUser({
          id: data.id,
          nome: data.nome ?? "Usuário",
          email: data.email ?? "",
          telefone: (data as any).telefone ?? "",
          avatarUrl: resolveImageUrl(data.avatarUrl) ?? null,
          mentoradoId: data.mentorado?.id ?? null,
          accountType: (data.mentorado?.tipo as any) ?? null,
          isMentor: data.mentor !== undefined && data.mentor !== null,
        });
      } catch (err) {
        console.error("[PerfilMentorado] carregar usuário atual falhou:", err);
      }
    };

    loadCurrentUser();
  }, []);

  // Carregar dados do usuário e mentorado
  useEffect(() => {
    (async () => {
      const mentoradoIdParam =
        (search.get("mentoradoId") || location?.state?.mentoradoId || "")?.toString().trim() ||
        null;

      async function loadCurrentUser() {
        const jwt = getToken();
        const userId = pickUserIdFromJwt(jwt);
        if (!jwt || !userId) {
          setUsuario((p: any) => ({ ...p, nome: "Usuário", email: "" }));
          return;
        }
        try {
          const data = await getUsuarioById(userId);
          setUsuario({
            id: data.id,
            nome: data.nome ?? "Usuário",
            email: data.email ?? "",
            telefone: (data as any).telefone ?? "",
            avatarUrl: resolveImageUrl(data.avatarUrl) ?? null,
            mentoradoId: data.mentorado?.id ?? null,
            accountType: (data.mentorado?.tipo as any) ?? null,
            isMentor: data.mentor !== undefined && data.mentor !== null,
          });
          setUserForm({
            nome: data.nome ?? "",
            email: data.email ?? "",
            telefone: ((data as any).telefone ?? "") as string,
            novaSenha: "",
          });
          
          // Carregar dados completos do mentorado se existir
          if (data.mentorado?.id) {
            try {
              const mentoradoData = await getMentoradoById(data.mentorado.id);
              setMentForm({
                tipo: mentoradoData.tipo || "",
                rg: mentoradoData.rg || "",
                cpf: mentoradoData.cpf || "",
                nomePai: mentoradoData.nomePai || "",
                nomeMae: mentoradoData.nomeMae || "",
                dataNascimento: mentoradoData.dataNascimento || "",
                rua: mentoradoData.rua || "",
                numero: mentoradoData.numero || "",
                complemento: mentoradoData.complemento || "",
                cep: mentoradoData.cep || "",
                cargoObjetivo: mentoradoData.cargoObjetivo || "",
                pretensaoClt: mentoradoData.pretensaoClt || "",
                pretensaoPj: mentoradoData.pretensaoPj || "",
                linkedin: mentoradoData.linkedin || "",
              });
            } catch (err) {
              console.error("Erro ao carregar dados do mentorado:", err);
            }
          }

          // Carregar vigencias do usuário
          await carregarVigencias(userId);
        } catch (err) {
          console.error("[PerfilMentorado] carregar usuário logado falhou:", err);
        }
      }

      if (mentoradoIdParam) {
        try {
          // Buscar dados do mentorado
          const mentoradoData = await getMentoradoById(mentoradoIdParam);
          
          // Buscar dados do usuário associado
          const usuarioData = await getUsuarioById(mentoradoData.usuarioId);
          
          setUsuario({
            id: usuarioData.id,
            nome: usuarioData.nome ?? "Usuário",
            email: usuarioData.email ?? "",
            telefone: (usuarioData as any).telefone ?? "",
            avatarUrl: resolveImageUrl(usuarioData.avatarUrl) ?? null,
            mentoradoId: mentoradoIdParam,
            accountType: mentoradoData.tipo ?? null,
            isMentor: usuarioData.mentor !== undefined && usuarioData.mentor !== null,
          });

          setUserForm({
            nome: usuarioData.nome ?? "",
            email: usuarioData.email ?? "",
            telefone: (usuarioData as any).telefone ?? "",
            novaSenha: "",
          });

          setMentForm({
            tipo: mentoradoData.tipo || "",
            rg: mentoradoData.rg || "",
            cpf: mentoradoData.cpf || "",
            nomePai: mentoradoData.nomePai || "",
            nomeMae: mentoradoData.nomeMae || "",
            dataNascimento: mentoradoData.dataNascimento || "",
            rua: mentoradoData.rua || "",
            numero: mentoradoData.numero || "",
            complemento: mentoradoData.complemento || "",
            cep: mentoradoData.cep || "",
            cargoObjetivo: mentoradoData.cargoObjetivo || "",
            pretensaoClt: mentoradoData.pretensaoClt || "",
            pretensaoPj: mentoradoData.pretensaoPj || "",
            linkedin: mentoradoData.linkedin || "",
          });

          // Carregar vigencias do usuário
          await carregarVigencias(usuarioData.id);
        } catch (err) {
          console.warn("[PerfilMentorado] falha ao carregar mentorado:", err);
          await loadCurrentUser();
        }
      } else {
        await loadCurrentUser();
      }
    })();
  }, [search, location]);

  // Função para carregar vigencias
  const carregarVigencias = async (usuarioId: string) => {
    if (!usuarioId) return;
    
    setLoadingVigencias(true);
    try {
      const vigenciasData = await listVigenciasPorUsuario(usuarioId);
      setVigencias(vigenciasData);
    } catch (error) {
      console.error("Erro ao carregar vigencias:", error);
      alert("Erro ao carregar histórico de vigencias");
    } finally {
      setLoadingVigencias(false);
    }
  };

  const avatarFallback = "/images/avatar.png";
  const avatarSrc = usuario.avatarUrl?.trim() ? usuario.avatarUrl! : avatarFallback;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!usuario.id) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await api.post(`/usuarios/${usuario.id}/avatar`, formData);
      if (data?.url) {
        const absolute = resolveImageUrl(String(data.url));
        const busted = cacheBust(absolute);
        setUsuario((prev: Usuario) => ({ ...prev, avatarUrl: busted || absolute || data.url }));
      }
    } catch (err) {
      console.error("[PerfilMentorado] upload avatar falhou:", err);
      alert("Erro ao fazer upload do avatar");
    } finally {
      if (e.currentTarget) e.currentTarget.value = "";
    }
  }

  async function salvarUsuario() {
    if (!usuario.id) return;
    setLoading(true);
    try {
      await updateUsuario(usuario.id, {
        nome: userForm.nome?.trim(),
        email: userForm.email?.trim(),
        telefone: userForm.telefone?.trim(),
        novaSenha: userForm.novaSenha?.trim() || undefined,
      });
      setUsuario((prev: Usuario) => ({ 
        ...prev, 
        nome: userForm.nome?.trim() || prev.nome,
        email: userForm.email?.trim() || prev.email,
        telefone: userForm.telefone?.trim() || prev.telefone
      }));
      alert("Dados atualizados com sucesso!");
      setUserForm(prev => ({ ...prev, novaSenha: "" }));
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Falha ao atualizar usuário.");
    } finally {
      setLoading(false);
    }
  }

  async function salvarMentorado() {
    if (!usuario.mentoradoId) {
      alert("Mentorado ainda não vinculado a este usuário.");
      return;
    }
    
    setLoading(true);
    try {
      // Converter valores numéricos
      const pretensaoClt = mentForm.pretensaoClt ? Number(mentForm.pretensaoClt) : undefined;
      const pretensaoPj = mentForm.pretensaoPj ? Number(mentForm.pretensaoPj) : undefined;
      
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
        pretensaoClt: pretensaoClt,
        pretensaoPj: pretensaoPj,
        linkedin: mentForm.linkedin || undefined,
      });
      
      setUsuario((prev: Usuario) => ({ 
        ...prev, 
        accountType: mentForm.tipo || prev.accountType 
      }));
      
      alert("Dados de mentorado atualizados com sucesso!");
    } catch (e: any) {
      console.error("Erro ao atualizar mentorado:", e);
      alert(e?.response?.data?.message ?? "Falha ao atualizar mentorado. Verifique os dados informados.");
    } finally {
      setLoading(false);
    }
  }

  // Funções para gerenciar vigencias
  const iniciarEdicaoVigencia = (vigencia: VigenciaDto) => {
    setVigenciaEditando(vigencia.id);
    setVigenciaForm({
      inicio: new Date(vigencia.inicio).toISOString().slice(0, 16),
      fim: vigencia.fim ? new Date(vigencia.fim).toISOString().slice(0, 16) : ""
    });
  };

  const cancelarEdicaoVigencia = () => {
    setVigenciaEditando(null);
    setVigenciaForm({ inicio: "", fim: "" });
  };

  const salvarVigencia = async (vigenciaId: string) => {
    if (!usuario.id) return;
    
    setLoading(true);
    try {
      await updateVigencia(vigenciaId, {
        inicio: vigenciaForm.inicio ? new Date(vigenciaForm.inicio).toISOString() : undefined,
        fim: vigenciaForm.fim ? new Date(vigenciaForm.fim).toISOString() : null
      });
      
      await carregarVigencias(usuario.id);
      setVigenciaEditando(null);
      setVigenciaForm({ inicio: "", fim: "" });
      alert("Vigência atualizada com sucesso!");
    } catch (e: any) {
      console.error("Erro ao atualizar vigência:", e);
      alert(e?.response?.data?.message ?? "Falha ao atualizar vigência.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatusVigencia = async (ativar: boolean) => {
    if (!usuario.id) return;
    
    setLoading(true);
    try {
      await toggleVigencia(usuario.id, ativar);
      await carregarVigencias(usuario.id);
      alert(`Vigência ${ativar ? 'ativada' : 'desativada'} com sucesso!`);
    } catch (e: any) {
      console.error("Erro ao alterar status da vigência:", e);
      alert(e?.response?.data?.message ?? "Falha ao alterar status da vigência.");
    } finally {
      setLoading(false);
    }
  };

  // Função para excluir usuário - SOMENTE MENTORES
  const excluirUsuario = async () => {
    if (!usuario.id) return;
    
    // Verificar se o usuário atual é um mentor
    if (!currentUser?.isMentor) {
      alert("Apenas mentores podem excluir contas de mentorados.");
      return;
    }
    
    setLoading(true);
    try {
      await deleteUsuario(usuario.id);
      alert("Usuário excluído com sucesso!");
      // Redirecionar para a página inicial ou login
      window.location.href = "/";
    } catch (e: any) {
      console.error("Erro ao excluir usuário:", e);
      alert(e?.response?.data?.message ?? "Falha ao excluir usuário.");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // Verificar se o usuário atual pode excluir (é mentor)
  const podeExcluir = currentUser?.isMentor;

  // Encontrar vigência ativa
  const vigenciaAtiva = vigencias.find(v => v.fim === null);

  return (
    <div className="perfil-mentor-page">
      <div className="perfil-scroll-container">
        <MentoradoHeader />

        <div className="perfil-container">
          <div className="perfil-header">
            <div className="perfil-avatar-section">
              <img
                src={avatarSrc}
                alt="Usuário"
                className="perfil-avatar"
                draggable={false}
                onClick={() => fileInputRef.current?.click()}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (img.src !== window.location.origin + avatarFallback && img.src !== avatarFallback) {
                    img.src = avatarFallback;
                  }
                }}
              />
              <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleAvatarChange} />
              <div className="perfil-user-info">
                <h1>{usuario.nome}</h1>
                <p>{usuario.email}</p>
                {usuario.telefone && <p className="perfil-telefone">{usuario.telefone}</p>}
                {usuario.accountType && (
                  <span className={`perfil-badge ${usuario.accountType.toLowerCase().replace(' ', '')}`}>
                    {usuario.accountType}
                  </span>
                )}
                {currentUser && (
                  <span className={`perfil-badge ${currentUser.isMentor ? 'admin' : 'normal'}`}>
                    {currentUser.isMentor ? 'Mentor' : 'Mentorado'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="perfil-content">
            {/* EDITAR USUÁRIO */}
            <div className="perfil-section">
              <h2>Editar Usuário</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome Completo</label>
                  <input 
                    placeholder="Nome" 
                    value={userForm.nome} 
                    onChange={(e) => setUserForm((s) => ({ ...s, nome: e.target.value }))} 
                  />
                </div>
                <div className="form-group">
                  <label>E-mail</label>
                  <input 
                    placeholder="E-mail" 
                    type="email"
                    value={userForm.email} 
                    onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))} 
                  />
                </div>
                <div className="form-group">
                  <label>Telefone</label>
                  <input 
                    placeholder="Telefone" 
                    value={userForm.telefone} 
                    onChange={(e) => setUserForm((s) => ({ ...s, telefone: e.target.value }))} 
                  />
                </div>
                <div className="form-group">
                  <label>Nova Senha (opcional)</label>
                  <input 
                    placeholder="Nova senha (opcional)" 
                    type="password" 
                    value={userForm.novaSenha} 
                    onChange={(e) => setUserForm((s) => ({ ...s, novaSenha: e.target.value }))} 
                  />
                </div>
              </div>
              <button className="btn-primary" onClick={salvarUsuario} disabled={loading}>
                {loading ? "Salvando..." : "Salvar Dados do Usuário"}
              </button>
            </div>

            {/* DADOS DO MENTORADO */}
            {usuario.mentoradoId ? (
              <div className="perfil-section">
                <h2>Dados do Mentorado</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Tipo</label>
                    <select value={mentForm.tipo} onChange={(e) => setMentForm((s) => ({ ...s, tipo: e.target.value as any }))}>
                      <option value="">— Selecione —</option>
                      <option value="Executive">Executive</option>
                      <option value="First Class">First Class</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Cargo Objetivo</label>
                    <input placeholder="Cargo Objetivo" value={mentForm.cargoObjetivo} onChange={(e) => setMentForm((s) => ({ ...s, cargoObjetivo: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>RG</label>
                    <input placeholder="RG" value={mentForm.rg} onChange={(e) => setMentForm((s) => ({ ...s, rg: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>CPF</label>
                    <input placeholder="CPF" value={mentForm.cpf} onChange={(e) => setMentForm((s) => ({ ...s, cpf: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Data de Nascimento</label>
                    <input type="date" placeholder="Data de Nascimento" value={mentForm.dataNascimento} onChange={(e) => setMentForm((s) => ({ ...s, dataNascimento: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>LinkedIn (URL)</label>
                    <input placeholder="LinkedIn (URL)" value={mentForm.linkedin} onChange={(e) => setMentForm((s) => ({ ...s, linkedin: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Rua</label>
                    <input placeholder="Rua" value={mentForm.rua} onChange={(e) => setMentForm((s) => ({ ...s, rua: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Número</label>
                    <input placeholder="Número" value={mentForm.numero} onChange={(e) => setMentForm((s) => ({ ...s, numero: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Complemento</label>
                    <input placeholder="Complemento" value={mentForm.complemento} onChange={(e) => setMentForm((s) => ({ ...s, complemento: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>CEP</label>
                    <input placeholder="CEP" value={mentForm.cep} onChange={(e) => setMentForm((s) => ({ ...s, cep: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Pretensão CLT</label>
                    <input 
                      type="number" 
                      placeholder="Pretensão CLT" 
                      value={mentForm.pretensaoClt} 
                      onChange={(e) => setMentForm((s) => ({ ...s, pretensaoClt: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Pretensão PJ</label>
                    <input 
                      type="number" 
                      placeholder="Pretensão PJ" 
                      value={mentForm.pretensaoPj} 
                      onChange={(e) => setMentForm((s) => ({ ...s, pretensaoPj: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Nome do Pai</label>
                    <input placeholder="Nome do Pai" value={mentForm.nomePai} onChange={(e) => setMentForm((s) => ({ ...s, nomePai: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Nome da Mãe</label>
                    <input placeholder="Nome da Mãe" value={mentForm.nomeMae} onChange={(e) => setMentForm((s) => ({ ...s, nomeMae: e.target.value }))} />
                  </div>
                </div>
                <button className="btn-primary" onClick={salvarMentorado} disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Dados do Mentorado"}
                </button>
              </div>
            ) : (
              <div className="perfil-section">
                <h2>Mentorado</h2>
                <div className="empty-state">
                  <p>Este usuário ainda não possui um perfil de mentorado vinculado.</p>
                </div>
              </div>
            )}

            {/* GESTÃO DE VIGÊNCIAS */}
            <div className="perfil-section">
              <h2>Gestão de Vigências</h2>
              
              {/* Status atual */}
              <div className="vigencia-status">
                <div className="status-info">
                  <span>Status atual:</span>
                  <span className={`status-badge ${vigenciaAtiva ? 'ativa' : 'inativa'}`}>
                    {vigenciaAtiva ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <button 
                  className={`btn-small ${vigenciaAtiva ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => toggleStatusVigencia(!vigenciaAtiva)}
                  disabled={loading}
                >
                  {vigenciaAtiva ? 'Desativar' : 'Ativar'} Vigência
                </button>
              </div>

              {/* Lista de vigencias */}
              <div className="vigencia-list">
                <h3>Histórico de Vigências</h3>
                {loadingVigencias ? (
                  <p>Carregando vigencias...</p>
                ) : vigencias.length === 0 ? (
                  <p>Nenhuma vigência encontrada.</p>
                ) : (
                  vigencias.map((vigencia) => (
                    <div key={vigencia.id} className="vigencia-item">
                      {vigenciaEditando === vigencia.id ? (
                        <div className="vigencia-dates">
                          <div className="date-group">
                            <label>Início</label>
                            <input
                              type="datetime-local"
                              value={vigenciaForm.inicio}
                              onChange={(e) => setVigenciaForm(prev => ({ ...prev, inicio: e.target.value }))}
                            />
                          </div>
                          <div className="date-group">
                            <label>Fim</label>
                            <input
                              type="datetime-local"
                              value={vigenciaForm.fim}
                              onChange={(e) => setVigenciaForm(prev => ({ ...prev, fim: e.target.value }))}
                            />
                          </div>
                          <div className="vigencia-actions">
                            <button 
                              className="btn-primary" 
                              onClick={() => salvarVigencia(vigencia.id)}
                              disabled={loading}
                            >
                              Salvar
                            </button>
                            <button 
                              className="btn-secondary" 
                              onClick={cancelarEdicaoVigencia}
                              disabled={loading}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="vigencia-dates">
                            <div className="date-group">
                              <label>Início</label>
                              <span>{new Date(vigencia.inicio).toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="date-group">
                              <label>Fim</label>
                              <span>{vigencia.fim ? new Date(vigencia.fim).toLocaleString('pt-BR') : 'Ativa'}</span>
                            </div>
                          </div>
                          <button 
                            className="btn-small"
                            onClick={() => iniciarEdicaoVigencia(vigencia)}
                          >
                            Editar
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* EXCLUSÃO DE USUÁRIO - SOMENTE PARA MENTORES */}
            {podeExcluir && (
              <div className="perfil-section danger-section">
                <h2>Zona de Perigo</h2>
                <div className="danger-content">
                  <div className="warning-text">
                    <h3>Excluir Conta</h3>
                    <p>
                      Esta ação não pode ser desfeita. Todos os dados do usuário, 
                      incluindo mentorados, vigencias e arquivos serão permanentemente removidos.
                    </p>
                  </div>
                  <button 
                    className="btn-danger"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Excluir Usuário
                  </button>
                </div>

                {/* Modal de confirmação */}
                {showDeleteConfirm && (
                  <div className="modal-overlay">
                    <div className="modal-content">
                      <h3>Confirmar Exclusão</h3>
                      <p>Tem certeza que deseja excluir permanentemente este usuário?</p>
                      <div className="modal-actions">
                        <button 
                          className="btn-danger"
                          onClick={excluirUsuario}
                          disabled={loading}
                        >
                          {loading ? "Excluindo..." : "Sim, Excluir"}
                        </button>
                        <button 
                          className="btn-secondary"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={loading}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mensagem para mentorados tentando acessar exclusão */}
            {!podeExcluir && currentUser && (
              <div className="perfil-section info-section">
                <h2>Informações de Acesso</h2>
                <div className="info-content">
                  <p>
                    <strong>Atenção:</strong> Apenas mentores podem realizar exclusões de contas. 
                    Se você precisa excluir sua conta, entre em contato com um mentor responsável.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <img src="/images/dashboard.png" alt="" className="perfil-bg-image" draggable={false} />
      </div>
    </div>
  );
}