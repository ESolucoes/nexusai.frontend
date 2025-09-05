import { useEffect, useMemo, useState } from "react";
import { getSsiByWeek, listSsiWeeks, type SsiWeekRef, type SsiUnidade } from "../../lib/api";

type Props = {
  /** Controla abrir/fechar */
  open: boolean;
  onClose: () => void;
};

type Row = {
  metrica: string;
  valor: string;
  unidade: SsiUnidade;
  status: "OTIMO" | "BOM" | "RUIM";
  metaAplicada: string;
};

export default function SsiSemanaModal({ open, onClose }: Props) {
  const [weeks, setWeeks] = useState<SsiWeekRef[]>([]);
  const [loadingWeeks, setLoadingWeeks] = useState(false);

  const [inputDate, setInputDate] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<string>("");

  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [semana, setSemana] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingWeeks(true);
      setError(null);
      try {
        const w = await listSsiWeeks();
        setWeeks(w);
        if (w.length && !selectedWeek) setSelectedWeek(w[0].dataReferencia);
      } catch (e: any) {
        setError(e?.response?.data?.message || "Falha ao carregar semanas.");
      } finally {
        setLoadingWeeks(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleBuscarPorSelect() {
    if (!selectedWeek) return;
    await buscar(selectedWeek);
  }

  async function handleBuscarPorData() {
    if (!inputDate) return;
    await buscar(inputDate);
  }

  async function buscar(date: string) {
    setLoadingData(true);
    setError(null);
    try {
      const payload = await getSsiByWeek(date);
      setSemana(payload.semana);
      setRows(
        payload.itens.map((i) => ({
          metrica: i.metrica,
          valor: i.valor,
          unidade: i.unidade,
          status: i.status,
          metaAplicada: i.metaAplicada,
        }))
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || "Falha ao carregar registros da semana.");
      setSemana("");
      setRows([]);
    } finally {
      setLoadingData(false);
    }
  }

  const statusLabel: Record<Row["status"], string> = useMemo(
    () => ({ OTIMO: "Ótimo", BOM: "Bom", RUIM: "Ruim" }),
    []
  );

  if (!open) return null;

  return (
    <div
      onClick={() => onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(900px, 96vw)",
          maxHeight: "90vh",
          background: "#fff",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Ver registros por semana</h3>
          <button className="cv-upload-btn" onClick={onClose}>Fechar</button>
        </div>

        {/* Seletores */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ width: 110, fontSize: 13, color: "#334155" }}>Selecione:</label>
            <select
              disabled={loadingWeeks}
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, background: "#fff" }}
            >
              {weeks.length === 0 && <option value="">Nenhuma semana</option>}
              {weeks.map((w) => (
                <option key={w.dataReferencia} value={w.dataReferencia}>
                  {w.dataReferencia} ({w.totalMetricas})
                </option>
              ))}
            </select>
          </div>
          <button
            className="cv-upload-btn"
            disabled={!selectedWeek || loadingData}
            onClick={handleBuscarPorSelect}
          >
            {loadingData ? "Buscando…" : "Buscar por seleção"}
          </button>

          <div style={{ display: "contents" }} />

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ width: 110, fontSize: 13, color: "#334155" }}>Por data:</label>
            <input
              type="date"
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
            />
          </div>
          <button
            className="cv-upload-btn"
            disabled={!inputDate || loadingData}
            onClick={handleBuscarPorData}
          >
            {loadingData ? "Buscando…" : "Buscar por data"}
          </button>
        </div>

        {error && <div style={{ color: "#b00020", fontSize: 13 }}>{error}</div>}

        {/* Resultado */}
        <div style={{ borderTop: "1px solid #eee", paddingTop: 8, overflow: "auto" }}>
          <div style={{ marginBottom: 6, fontSize: 13, color: "#475569" }}>
            {semana ? <>Semana (segunda): <strong>{semana}</strong></> : "Selecione uma semana para visualizar"}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "8px 6px" }}>Métrica</th>
                <th style={{ padding: "8px 6px" }}>Valor</th>
                <th style={{ padding: "8px 6px" }}>Unidade</th>
                <th style={{ padding: "8px 6px" }}>Status</th>
                <th style={{ padding: "8px 6px" }}>Meta aplicada</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "12px 6px", color: "#64748b" }}>
                    {loadingData ? "Carregando…" : "Nenhum registro para a semana selecionada."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.metrica} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 6px" }}>{r.metrica}</td>
                    <td style={{ padding: "8px 6px" }}>{r.valor}</td>
                    <td style={{ padding: "8px 6px" }}>{r.unidade === "PERCENTUAL" ? "%" : "Número"}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 12,
                          background:
                            r.status === "OTIMO"
                              ? "#dbeafe"
                              : r.status === "BOM"
                              ? "#dcfce7"
                              : "#fee2e2",
                          border:
                            r.status === "OTIMO"
                              ? "1px solid #93c5fd"
                              : r.status === "BOM"
                              ? "1px solid #86efac"
                              : "1px solid #fca5a5",
                          color:
                            r.status === "OTIMO"
                              ? "#1d4ed8"
                              : r.status === "BOM"
                              ? "#166534"
                              : "#991b1b",
                        }}
                      >
                        {statusLabel[r.status]}
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px" }}>{r.metaAplicada}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
