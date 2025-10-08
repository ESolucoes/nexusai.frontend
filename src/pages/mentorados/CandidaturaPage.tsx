// frontend/src/pages/mentorados/CandidaturaPage.tsx
import { useEffect, useState } from "react";
import MentoradoHeader from "../../components/layout/MentoradoHeader";
import "../../styles/mentorados/candidatura.css";
import { enviarCandidatura } from "../../lib/api";
import type { CandidaturaPayload } from "../../lib/api";

export default function CandidaturaPage() {
  const [form, setForm] = useState<CandidaturaPayload>({
    tipoVaga: "",
    empresasBloqueadas: [],
    pretensaoClt: undefined,
    pretensaoPj: undefined,
    maxAplicacoes: 6,
  } as CandidaturaPayload);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.remove("login-bg");
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, []);

  async function handleEnviarCandidatura() {
    // Se não informou tipo de vaga, pergunta antes de continuar (busca geral)
    if (!form.tipoVaga?.trim()) {
      if (!confirm("Nenhum tipo de vaga informado. Deseja buscar vagas gerais?")) return;
    }

    setLoading(true);
    try {
      // envia sempre ativarIA = true (backend decide o comportamento)
      const resp = await enviarCandidatura({ ...form, ativarIA: true });
      // Backend está retornando um objeto com resultado da automação (se implementado)
      alert(`Solicitação processada. Resultado: ${JSON.stringify(resp?.result ?? resp)}`);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message ?? "Falha ao enviar candidatura.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mentorados-home">
      <div style={{ maxWidth: 840, margin: "40px auto", padding: 16 }}>
        <MentoradoHeader />

        <div className="mentorados-card" style={{ background: "#fff", color: "#0f172a" }}>
          <h3 style={{ marginTop: 0, textAlign: "center" }}>Nova Candidatura Automática</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <input
              placeholder="Tipo de Vaga (ex: Front-end)"
              value={form.tipoVaga ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, tipoVaga: e.target.value }))}
            />

            <input
              placeholder="Empresas bloqueadas (vírgula)"
              value={(form.empresasBloqueadas || []).join(",")}
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
              placeholder="Pretensão CLT (ex: 6000)"
              type="number"
              value={form.pretensaoClt ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, pretensaoClt: e.target.value ? Number(e.target.value) : undefined }))}
            />

            <input
              placeholder="Pretensão PJ (ex: 8000)"
              type="number"
              value={form.pretensaoPj ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, pretensaoPj: e.target.value ? Number(e.target.value) : undefined }))}
            />

            <input
              placeholder="Máx aplicações (ex: 6)"
              type="number"
              value={form.maxAplicacoes ?? 6}
              onChange={(e) => setForm((s) => ({ ...s, maxAplicacoes: e.target.value ? Number(e.target.value) : undefined }))}
            />

            <div /> {/* placeholder para manter grid simétrico */}
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="cv-upload-btn" onClick={handleEnviarCandidatura} disabled={loading}>
              {loading ? "Processando..." : "Iniciar candidaturas"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
