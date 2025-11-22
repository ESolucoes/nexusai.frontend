// frontend/src/pages/mentorados/HomePage.tsx
import { useEffect, useRef, useState } from "react";
import MentoradoHeader from "../../components/layout/MentoradoHeader";
import "../../styles/mentorados/home.css";
import { api, getToken, decodeJwt, getUsuarioById } from "../../lib/api";

/** Tabela única do SSI (12 semanas) */
import MentoradoSsiTabela from "../../components/mentorados/MentoradoSsiTabela";
/** Cronograma (8 semanas) + Rotina Fixa */
import CronogramaSemanasTable from "../../components/mentorados/CronogramaSemanasTable";
import RotinaSemanalFixa from "../../components/mentorados/RotinaSemanalFixa";

/** Modal de Headhunters */
import HeadhuntersModal from "../../components/mentorados/HeadhuntersModal";

function pickUserIdFromJwt(jwt?: string | null): string | null {
  const p = decodeJwt<any>(jwt);
  const candidates = [p?.sub, p?.id, p?.userId, p?.uid, p?.usuarioId, p?.user_id];
  const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  return found ? String(found) : null;
}

/** NOVA VERSÃO — usa VITE_PUBLIC_URL (domínio do FRONT) */
function resolveImageUrl(u?: string | null): string | null {
  if (!u) return null;

  // Se já for absoluta, retorna
  if (/^https?:\/\//i.test(u)) return u;

  const publicBase = (import.meta.env.VITE_PUBLIC_URL || "").replace(/\/+$/, "");
  const path = String(u).replace(/^\/+/, "");

  return `${publicBase}/${path}`;
}

/** Mantido igual — cache busting */
function cacheBust(u?: string | null): string | null {
  if (!u) return u ?? null;
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}t=${Date.now()}`;
}

export default function HomePage() {
  const [usuario, setUsuario] = useState<{
    id?: string;
    nome: string;
    email: string;
    avatarUrl?: string | null;
    accountType: "Executive" | "First Class" | null;
  }>({
    id: undefined,
    nome: "Carregando...",
    email: "",
    avatarUrl: null,
    accountType: null,
  });

  const [headhModalOpen, setHeadhModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.body.classList.remove("login-bg");
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, []);

  useEffect(() => {
    (async () => {
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
          avatarUrl: resolveImageUrl(data.avatarUrl) ?? null,
          accountType: (data.mentorado?.tipo as "Executive" | "First Class") ?? null,
        });
      } catch (err) {
        console.error("[HomePage] GET /usuarios/{id} falhou:", err);
        setUsuario({
          id: undefined,
          nome: "Usuário",
          email: "",
          avatarUrl: null,
          accountType: null,
        });
      }
    })();
  }, []);

  const avatarFallback = "/images/avatar.png";
  const avatarSrc =
    usuario.avatarUrl && usuario.avatarUrl.trim().length > 0
      ? usuario.avatarUrl
      : avatarFallback;

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
        setUsuario((prev) => ({
          ...prev,
          avatarUrl: busted || absolute || data.url,
        }));
      }
    } catch (err) {
      console.error("[HomePage] upload avatar falhou:", err);
    } finally {
      if (e.currentTarget) e.currentTarget.value = "";
    }
  }

  const badgeClass =
    usuario.accountType === "Executive"
      ? "mentorados-badge badge--executive"
      : usuario.accountType === "First Class"
      ? "mentorados-badge badge--firstclass"
      : "mentorados-badge hidden";

  return (
    <div className="mentorados-home">
      <div
        className="mentorados-scroll"
        style={{
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <MentoradoHeader />

        <div className="mentorados-cards">
          <div className="mentorados-card grid-span-4">
            <img
              src={avatarSrc}
              alt="Usuário"
              className="mentorados-avatar"
              draggable={false}
              onClick={() => fileInputRef.current?.click()}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (
                  img.src !== window.location.origin + avatarFallback &&
                  img.src !== avatarFallback
                ) {
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

            <div className="mentorados-user-info">
              <h2>{usuario.nome}</h2>
              <p>{usuario.email}</p>
            </div>

            <span className={badgeClass}>{usuario.accountType ?? ""}</span>
          </div>

          <button
            type="button"
            onClick={() => setHeadhModalOpen(true)}
            className="cv-upload-btn grid-span-4"
            style={{
              alignSelf: "flex-start",
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              marginBottom: 12,
              color: "#0f172a",
              fontWeight: 800,
            }}
            aria-haspopup="dialog"
            aria-expanded={headhModalOpen}
          >
            Headhunters
          </button>

          <div className="grid-span-12">
            <MentoradoSsiTabela />
          </div>

          <div className="grid-span-6">
            <CronogramaSemanasTable />
          </div>
          <div className="grid-span-6">
            <RotinaSemanalFixa />
          </div>
        </div>

        <img
          src="/images/dashboard.png"
          alt=""
          className="mentorados-center-image"
          draggable={false}
        />
      </div>

      <HeadhuntersModal
        open={headhModalOpen}
        onClose={() => setHeadhModalOpen(false)}
      />
    </div>
  );
}
