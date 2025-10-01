// frontend/src/pages/mentorados/PerfilMentoradoPage.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import MentoradoHeader from "../../components/layout/MentoradoHeader";
import "../../styles/mentorados/home.css";
import {
  api,
  getToken,
  pickUserIdFromJwt,
  getUsuarioById,
  updateUsuario,
  updateMentorado,
} from "../../lib/api";

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

/**
 * PerfilMentoradoPage
 * - Comportamento original: carrega usuário logado via JWT (getUsuarioById(userId))
 * - NOVO: se receber ?mentoradoId=... (ou location.state.mentoradoId) tenta carregar o mentorado específico.
 *   - se carregar com sucesso, preenche usuario + mentorado com os dados do mentorado.
 *   - se falhar, mantém fallback de carregar o usuário logado (comportamento anterior).
 *
 * Observação: tenta buscar mentorado em /mentorados/:id via api.get. Se sua API tiver outro endpoint
 * para obter mentorado (por ex. /mentorados/{id}/full ou getMentoradoById helper), adapte a chamada abaixo.
 */

export default function PerfilMentoradoPage() {
  const [search] = useSearchParams();
  const location = useLocation() as any;

  const [usuario, setUsuario] = useState<{
    id?: string;
    nome: string;
    email: string;
    telefone?: string | null;
    avatarUrl?: string | null;
    mentoradoId?: string | null;
    accountType: "Executive" | "First Class" | null;
  }>({
    id: undefined,
    nome: "Carregando...",
    email: "",
    telefone: "",
    avatarUrl: null,
    mentoradoId: null,
    accountType: null,
  });

  const [userForm, setUserForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    novaSenha: "",
  });

  // Form PutMentoradoDto
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

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.body.classList.remove("login-bg");
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, []);

  useEffect(() => {
    (async () => {
      // tenta obter mentoradoId da query string ou location.state
      const mentoradoIdParam =
        (search.get("mentoradoId") || location?.state?.mentoradoId || "")?.toString().trim() ||
        null;

      // função que carrega usuário logado (comportamento original)
      async function loadCurrentUser() {
        const jwt = getToken();
        const userId = pickUserIdFromJwt(jwt);
        if (!jwt || !userId) {
          setUsuario((p) => ({ ...p, nome: "Usuário", email: "" }));
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
          });
          setUserForm({
            nome: data.nome ?? "",
            email: data.email ?? "",
            telefone: ((data as any).telefone ?? "") as string,
            novaSenha: "",
          });
          const md: any = data.mentorado || {};
          setMentForm({
            tipo: (md.tipo as any) || "",
            rg: md.rg || "",
            cpf: md.cpf || "",
            nomePai: md.nomePai || "",
            nomeMae: md.nomeMae || "",
            dataNascimento: md.dataNascimento || "",
            rua: md.rua || "",
            numero: md.numero || "",
            complemento: md.complemento || "",
            cep: md.cep || "",
            cargoObjetivo: md.cargoObjetivo || "",
            pretensaoClt: md.pretensaoClt || "",
            pretensaoPj: md.pretensaoPj || "",
            linkedin: md.linkedin || "",
          });
        } catch (err) {
          console.error("[PerfilMentorado] carregar usuário logado falhou:", err);
        }
      }

      // Se vier mentoradoId, tentamos carregar o mentorado específico primeiro
      if (mentoradoIdParam) {
        try {
          // *** Ajuste aqui se seu endpoint for diferente. 
          // Ex.: api.get(`/mentorados/${mentoradoIdParam}/full`) ou usar helper getMentoradoById.
          const res = await api.get(`/mentorados/${encodeURIComponent(mentoradoIdParam)}`);
          const data = res?.data;

          /**
           * POSSÍVEIS formatos de resposta (tente cobrir os mais comuns):
           * - { usuario: { id, nome, email, avatarUrl, telefone }, ...mentoradoFields }
           * - { id: mentoradoId, usuarioId: '...', usuario: { ... }, ... }
           * - { usuarioId: '...', usuario: { ... }, ... }
           * - ou retorno direto do mentorado com campos 'usuario*' embutidos
           *
           * Aqui tentamos detectar `data.usuario` primeiro; se não, tentamos maps razoáveis;
           * se nada bater, fazemos fallback para carregar o usuário logado (comportamento original).
           */
          let usuarioFromMentorado: any = null;
          let mentoradoData: any = null;

          if (data) {
            if (data.usuario) {
              usuarioFromMentorado = data.usuario;
              mentoradoData = { ...data, usuario: undefined };
            } else if (data.user) {
              // alternativa comum
              usuarioFromMentorado = data.user;
              mentoradoData = { ...data, user: undefined };
            } else if (data.usuarioId && data.usuario) {
              usuarioFromMentorado = data.usuario;
              mentoradoData = { ...data, usuario: undefined };
            } else if (data.usuarioId && !data.usuario) {
              // talvez endpoint retorne apenas mentorado e precise buscar usuario separado
              try {
                const ures = await api.get(`/usuarios/${data.usuarioId}`);
                usuarioFromMentorado = ures.data;
                mentoradoData = data;
              } catch {
                usuarioFromMentorado = null;
              }
            } else if (data.nome && data.email) {
              // se a resposta já é um usuário (alguns endpoints podem retornar isso)
              usuarioFromMentorado = data;
              mentoradoData = {};
            } else {
              // fallback: se a API retornou um wrapper { data: {...} }
              if (data.data && typeof data.data === "object") {
                const inner = data.data;
                if (inner.usuario) {
                  usuarioFromMentorado = inner.usuario;
                  mentoradoData = { ...inner, usuario: undefined };
                } else if (inner.nome && inner.email) {
                  usuarioFromMentorado = inner;
                  mentoradoData = {};
                }
              }
            }
          }

          if (usuarioFromMentorado) {
            // preenche UI com dados do mentorado (substitui o comportamento padrão neste caso)
            setUsuario({
              id: usuarioFromMentorado.id,
              nome: usuarioFromMentorado.nome ?? "Usuário",
              email: usuarioFromMentorado.email ?? "",
              telefone: (usuarioFromMentorado as any).telefone ?? "",
              avatarUrl: resolveImageUrl(usuarioFromMentorado.avatarUrl) ?? null,
              mentoradoId: mentoradoIdParam, // garante que mentoradoId esteja presente
              accountType: (usuarioFromMentorado.mentorado?.tipo as any) ?? (usuarioFromMentorado.tipo as any) ?? null,
            });

            setUserForm({
              nome: usuarioFromMentorado.nome ?? "",
              email: usuarioFromMentorado.email ?? "",
              telefone: ((usuarioFromMentorado as any).telefone ?? "") as string,
              novaSenha: "",
            });

            // preenche mentForm a partir do mentoradoData ou dos campos aninhados
            const md = mentoradoData || usuarioFromMentorado.mentorado || usuarioFromMentorado;
            setMentForm({
              tipo: (md.tipo as any) || "",
              rg: md.rg || "",
              cpf: md.cpf || "",
              nomePai: md.nomePai || "",
              nomeMae: md.nomeMae || "",
              dataNascimento: md.dataNascimento || "",
              rua: md.rua || "",
              numero: md.numero || "",
              complemento: md.complemento || "",
              cep: md.cep || "",
              cargoObjetivo: md.cargoObjetivo || "",
              pretensaoClt: md.pretensaoClt || "",
              pretensaoPj: md.pretensaoPj || "",
              linkedin: md.linkedin || "",
            });
            return; // sucesso, já carregou mentorado
          }

          // se chegamos aqui, a tentativa de ler mentorado pelo id não trouxe um usuário válido:
          console.warn("[PerfilMentorado] resposta /mentorados/:id inesperada, fallback para usuário logado.", res?.data);
          await loadCurrentUser(); // fallback
        } catch (err) {
          console.warn("[PerfilMentorado] falha ao carregar mentorado por mentoradoId:", err);
          // fallback para comportamento original (carregar usuário logado)
          await loadCurrentUser();
        }
      } else {
        // sem mentoradoId: comportamento original (usuário logado)
        await loadCurrentUser();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intencional: roda uma vez na montagem

  const avatarFallback = "/images/avatar.png";
  const avatarSrc = usuario.avatarUrl?.trim() ? usuario.avatarUrl! : avatarFallback;
  const badgeClass =
    usuario.accountType === "Executive"
      ? "mentorados-badge badge--executive"
      : usuario.accountType === "First Class"
      ? "mentorados-badge badge--firstclass"
      : "mentorados-badge hidden";

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
        setUsuario((prev) => ({ ...prev, avatarUrl: busted || absolute || data.url }));
      }
    } catch (err) {
      console.error("[PerfilMentorado] upload avatar falhou:", err);
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
      alert("Dados atualizados!");
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
    try {
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
        pretensaoClt: mentForm.pretensaoClt ? Number(mentForm.pretensaoClt) : undefined,
        pretensaoPj: mentForm.pretensaoPj ? Number(mentForm.pretensaoPj) : undefined,
        linkedin: mentForm.linkedin || undefined,
      });
      alert("Dados de mentorado atualizados!");
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Falha ao atualizar mentorado.");
    }
  }

  return (
    <div className="mentorados-home">
      <div className="mentorados-scroll" style={{ height: "100vh", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" }}>
        <MentoradoHeader />

        <div className="mentorados-cards">
          {/* CARD DO USUÁRIO */}
          <div className="mentorados-card">
            <img
              src={avatarSrc}
              alt="Usuário"
              className="mentorados-avatar"
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
            <div className="mentorados-user-info">
              <h2>{usuario.nome}</h2>
              <p>{usuario.email}</p>
            </div>
            <span className={badgeClass}>{usuario.accountType ?? ""}</span>
          </div>

          {/* EDITAR USUÁRIO */}
          <div className="mentorados-card" style={{ background: "#fff", color: "#0f172a" }}>
            <div style={{ width: "100%" }}>
              <h3 style={{ marginTop: 0 }}>Editar Usuário</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input placeholder="Nome" value={userForm.nome} onChange={(e) => setUserForm((s) => ({ ...s, nome: e.target.value }))} />
                <input placeholder="E-mail" value={userForm.email} onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))} />
                <input placeholder="Telefone" value={userForm.telefone} onChange={(e) => setUserForm((s) => ({ ...s, telefone: e.target.value }))} />
                <input placeholder="Nova senha (opcional)" type="password" value={userForm.novaSenha} onChange={(e) => setUserForm((s) => ({ ...s, novaSenha: e.target.value }))} />
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="cv-upload-btn" onClick={salvarUsuario} disabled={loading}>
                  Salvar
                </button>
              </div>
            </div>
          </div>

          {/* MENTORADO */}
          <div className="mentorados-card" style={{ background: "#fff", color: "#0f172a" }}>
            <div style={{ width: "100%" }}>
              <h3 style={{ marginTop: 0 }}>Mentorado</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <select value={mentForm.tipo} onChange={(e) => setMentForm((s) => ({ ...s, tipo: e.target.value as any }))}>
                  <option value="">— Tipo —</option>
                  <option value="Executive">Executive</option>
                  <option value="First Class">First Class</option>
                </select>
                <input placeholder="Cargo Objetivo" value={mentForm.cargoObjetivo} onChange={(e) => setMentForm((s) => ({ ...s, cargoObjetivo: e.target.value }))} />
                <input placeholder="RG" value={mentForm.rg} onChange={(e) => setMentForm((s) => ({ ...s, rg: e.target.value }))} />
                <input placeholder="CPF" value={mentForm.cpf} onChange={(e) => setMentForm((s) => ({ ...s, cpf: e.target.value }))} />
                <input type="date" placeholder="Data de Nascimento" value={mentForm.dataNascimento} onChange={(e) => setMentForm((s) => ({ ...s, dataNascimento: e.target.value }))} />
                <input placeholder="LinkedIn (URL)" value={mentForm.linkedin} onChange={(e) => setMentForm((s) => ({ ...s, linkedin: e.target.value }))} />
                <input placeholder="Rua" value={mentForm.rua} onChange={(e) => setMentForm((s) => ({ ...s, rua: e.target.value }))} />
                <input placeholder="Número" value={mentForm.numero} onChange={(e) => setMentForm((s) => ({ ...s, numero: e.target.value }))} />
                <input placeholder="Complemento" value={mentForm.complemento} onChange={(e) => setMentForm((s) => ({ ...s, complemento: e.target.value }))} />
                <input placeholder="CEP" value={mentForm.cep} onChange={(e) => setMentForm((s) => ({ ...s, cep: e.target.value }))} />
                <input placeholder="Pretensão CLT" value={mentForm.pretensaoClt} onChange={(e) => setMentForm((s) => ({ ...s, pretensaoClt: e.target.value }))} />
                <input placeholder="Pretensão PJ" value={mentForm.pretensaoPj} onChange={(e) => setMentForm((s) => ({ ...s, pretensaoPj: e.target.value }))} />
                <input placeholder="Nome do Pai" value={mentForm.nomePai} onChange={(e) => setMentForm((s) => ({ ...s, nomePai: e.target.value }))} />
                <input placeholder="Nome da Mãe" value={mentForm.nomeMae} onChange={(e) => setMentForm((s) => ({ ...s, nomeMae: e.target.value }))} />
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="cv-upload-btn" onClick={salvarMentorado} disabled={!usuario.mentoradoId}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>

        <img src="/images/dashboard.png" alt="" className="mentorados-center-image" draggable={false} />
      </div>
    </div>
  );
}
