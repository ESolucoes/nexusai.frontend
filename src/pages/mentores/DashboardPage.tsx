import { useEffect, useRef, useState } from "react";
import Header from "../../components/layout/Header";
import "../../styles/mentores/dashboard.css";
import { api, getToken } from "../../lib/api";
import MentoresTable from "../../components/mentores/MentoresTable";
import MentoradosTable from "../../components/mentores/MentoradosTable";
import NovoMentorModal from "../../components/mentores/NovoMentorModal";
import NovoMentoradoModal from "../../components/mentores/NovoMentoradoModal";

type UsuarioResponse = {
  id: string;
  nome: string;
  email: string;
  avatarUrl?: string | null;
  mentor?: { id?: string; tipo?: "admin" | "normal" | string };
};

type CountResponse = { total: number };

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

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<{
    id?: string;
    nome: string;
    email: string;
    tipoConta: "admin" | "normal";
    avatarUrl?: string | null;
  }>({
    id: undefined,
    nome: "Carregando...",
    email: "",
    tipoConta: "normal",
    avatarUrl: null,
  });

  const [totalMentores, setTotalMentores] = useState<number>(0);
  const [totalMentorados, setTotalMentorados] = useState<number>(0);

  const [tabela, setTabela] = useState<"mentores" | "mentorados">("mentores");
  const [refreshMentoresKey, setRefreshMentoresKey] = useState(0);
  const [refreshMentoradosKey, setRefreshMentoradosKey] = useState(0);

  const [showMentorModal, setShowMentorModal] = useState(false);
  const [showMentoradoModal, setShowMentoradoModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        setUsuario({ nome: "Usuário", email: "", tipoConta: "normal", avatarUrl: null });
        return;
      }
      const payload = decodeJwt<any>(token);
      const userId = payload?.sub || payload?.id || payload?.userId || payload?.uid || payload?.usuarioId;
      if (!userId) {
        setUsuario({ nome: "Usuário", email: "", tipoConta: "normal", avatarUrl: null });
        return;
      }
      try {
        const { data } = await api.get<UsuarioResponse>(`/usuarios/${userId}`, { signal: controller.signal as any });
        const tipo = (data.mentor?.tipo?.toLowerCase?.() as "admin" | "normal") ?? "normal";
        setUsuario({
          id: data.id,
          nome: data.nome || "Usuário",
          email: data.email || "",
          tipoConta: tipo === "admin" ? "admin" : "normal",
          avatarUrl: data.avatarUrl || null,
        });
      } catch {
        setUsuario({ nome: "Usuário", email: "", tipoConta: "normal", avatarUrl: null });
      }
    })();
    return () => controller.abort();
  }, []);

  async function refreshCountMentores() {
    try {
      const { data } = await api.get<CountResponse>(`/usuarios/mentores/count`);
      setTotalMentores(data.total ?? 0);
    } catch {
      setTotalMentores(0);
    }
  }

  async function refreshCountMentorados() {
    try {
      const { data } = await api.get<CountResponse>(`/usuarios/mentorados/count`);
      setTotalMentorados(data.total ?? 0);
    } catch {
      setTotalMentorados(0);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { data } = await api.get<CountResponse>(`/usuarios/mentores/count`, { signal: controller.signal as any });
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
        const { data } = await api.get<CountResponse>(`/usuarios/mentorados/count`, { signal: controller.signal as any });
        setTotalMentorados(data.total ?? 0);
      } catch {
        setTotalMentorados(0);
      }
    })();
    return () => controller.abort();
  }, [refreshMentoradosKey]);

  const badgeClass = usuario.tipoConta === "admin" ? "dashboard-badge badge--admin" : "dashboard-badge badge--normal";
  const badgeLabel = usuario.tipoConta === "admin" ? "Admin" : "Normal";
  const avatarFallback = "/images/avatar.png";
  const avatarSrc = usuario.avatarUrl && usuario.avatarUrl.trim().length > 0 ? usuario.avatarUrl : avatarFallback;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!usuario.id) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post(`/usuarios/${usuario.id}/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data?.url) {
        setUsuario((prev) => ({ ...prev, avatarUrl: data.url }));
      }
    } catch (err) {
      console.error("Erro ao enviar avatar", err);
    }
  }

  return (
    <div className="mentores-dashboard">
      <Header />
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <img
            src={avatarSrc}
            alt="Usuário"
            className="dashboard-avatar"
            draggable={false}
            onClick={() => fileInputRef.current?.click()}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (img.src !== window.location.origin + avatarFallback && img.src !== avatarFallback) {
                img.src = avatarFallback;
              }
            }}
          />
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleAvatarChange}
          />
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
          <button className="action-btn primary" onClick={() => setShowMentorModal(true)}>Novo Mentor</button>
          <button className="action-btn primary" onClick={() => setShowMentoradoModal(true)}>Novo Mentorado</button>
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
        <NovoMentorModal
          onClose={() => setShowMentorModal(false)}
          onSuccess={async () => {
            setShowMentorModal(false);
            setRefreshMentoresKey((v) => v + 1);
            await refreshCountMentores();
          }}
        />
      )}

      {showMentoradoModal && (
        <NovoMentoradoModal
          onClose={() => setShowMentoradoModal(false)}
          onSuccess={async () => {
            setShowMentoradoModal(false);
            setRefreshMentoradosKey((v) => v + 1);
            await refreshCountMentorados();
          }}
        />
      )}
    </div>
  );
}
