// frontend/src/pages/mentorados/CandidaturaPage.tsx
import { useEffect, useState } from "react";
import MentoradoHeader from "../../components/layout/MentoradoHeader";
import "../../styles/mentorados/candidatura.css"; // Mesmo CSS do perfil
import { enviarCandidatura } from "../../lib/api";
import type { CandidaturaPayload } from "../../lib/api";

export default function CandidaturaPage() {
  const [form, setForm] = useState<CandidaturaPayload>({
    linkedin: "",
    tipoVaga: "",
    empresasBloqueadas: [],
    pretensaoClt: undefined,
    pretensaoPj: undefined,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.remove("login-bg");
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, []);

  async function handleEnviarCandidatura() {
    if (!form.linkedin?.trim()) {
      alert("LinkedIn é obrigatório");
      return;
    }

    setLoading(true);
    try {
      // envia sempre ativarIA = true
      await enviarCandidatura({ ...form, ativarIA: true });
      alert("Candidatura enviada com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message ?? "Falha ao enviar candidatura.");
    } finally {
      setLoading(false);
    }
  }

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
          <div
            className="mentorados-card grid-span-12"
            style={{ background: "#fff", color: "#0f172a" }}
          >
            <h3 style={{ marginTop: 0 }}>Nova Candidatura</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <input
                placeholder="LinkedIn do Mentorado"
                value={form.linkedin}
                onChange={(e) => setForm((s) => ({ ...s, linkedin: e.target.value }))}
              />
              <input
                placeholder="Tipo de Vaga"
                value={form.tipoVaga ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, tipoVaga: e.target.value }))}
              />
              <input
                placeholder="Empresas Bloqueadas (separadas por vírgula)"
                value={form.empresasBloqueadas?.join(",") ?? ""}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    empresasBloqueadas: e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  }))
                }
              />
              <input
                placeholder="Pretensão CLT"
                type="number"
                value={form.pretensaoClt ?? ""}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    pretensaoClt: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
              <input
                placeholder="Pretensão PJ"
                type="number"
                value={form.pretensaoPj ?? ""}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    pretensaoPj: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                className="cv-upload-btn"
                onClick={handleEnviarCandidatura}
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar Candidatura"}
              </button>
            </div>
          </div>
        </div>

        <img
          src="/images/dashboard.png"
          alt="Imagem ilustrativa"
          className="mentorados-center-image"
          draggable={false}
        />
      </div>
    </div>
  );
}
