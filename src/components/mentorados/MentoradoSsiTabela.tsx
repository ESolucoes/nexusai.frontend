import { useEffect, useMemo, useState } from "react";
import {
  getMssTabelaVazia,
  postMssClassificar,
  type MssClassificarInItem,
  type MssClassificarOutItem,
  type MssTabelaVaziaItem,
  type MssIndicador,
  type MssStatus,
} from "../../lib/api";

/** badge por status */
function StatusPill({ s }: { s?: MssStatus }) {
  const map =
    s === "OTIMO"
      ? { bg: "#dbeafe", bd: "#93c5fd", fg: "#1d4ed8", label: "Ótimo" }
      : s === "BOM"
      ? { bg: "#dcfce7", bd: "#86efac", fg: "#166534", label: "Bom" }
      : s === "RUIM"
      ? { bg: "#fee2e2", bd: "#fca5a5", fg: "#991b1b", label: "Ruim" }
      : { bg: "#f1f5f9", bd: "#e2e8f0", fg: "#475569", label: "—" };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        background: map.bg,
        border: `1px solid ${map.bd}`,
        color: map.fg,
        whiteSpace: "nowrap",
      }}
    >
      {map.label}
    </span>
  );
}

/** mapa de labels amigáveis (se quiser customizar nomes) */
const LABELS: Partial<Record<MssIndicador, string>> = {
  SSI_SETOR: "SSI no seu Setor",
  SSI_REDE: "SSI na sua Rede",
  SSI_TOTAL: "Social Selling Index",
  PILAR_MARCA: "Estabelecer sua Marca Profissional",
  PILAR_PESSOAS_CERTAS: "Localizar as Pessoas Certas",
  PILAR_INSIGHTS: "Interagir oferecendo Insights",
  PILAR_RELACIONAMENTOS: "Cultivar Relacionamentos",
  IMPRESSOES_PUBLICACAO: "Impressões da Publicação",
  VISUALIZACOES_PERFIL: "Visualizações do Perfil",
  OCORRENCIAS_PESQUISA: "Ocorrências em Resultado de Pesquisa",
  CARGOS_ENCONTRARAM_PERFIL: "Cargos (Decisor | RHs)",
  TAXA_RECRUTADORES: "Taxa de Recrutadores que viram seu perfil (%)",
  CANDIDATURAS_SIMPLIFICADAS: "Candidaturas Simplificadas",
  CANDIDATURAS_VISUALIZADAS: "Candidaturas Visualizadas",
  CURRICULOS_BAIXADOS: "Currículos Baixados",
  CONTATOS_RH: "Contatos de RH na semana",
  PUBLICACOES_SEMANA: "Publicações na Semana",
  INTERACOES_COMENTARIOS: "Interações via comentários",
  PEDIDOS_CONEXAO_HEADHUNTERS: "Pedidos de Conexão (Headhunters)",
  PEDIDOS_CONEXAO_DECISORES: "Pedidos de Conexão (Decisores)",
  MENSAGENS_RECRUTADORES: "Mensagens para Recrutadores",
  MENSAGENS_NETWORKING: "Mensagens para Networking",
  CAFES_AGENDADOS: "Cafés Agendados",
  CAFES_TOMADOS: "Cafés Tomados",
  ENTREVISTAS_REALIZADAS: "Entrevistas Realizadas",
  ENTREVISTAS_FASE_FINAL: "Entrevistas em Fase Final",
  CARTAS_OFERTA: "Cartas Oferta Recebidas",
};

type RowState = MssTabelaVaziaItem & {
  statusSemanal?: MssStatus[]; // preenchido após classificar
};

export default function MentoradoSsiTabela() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RowState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  // carrega esqueleto
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const base = await getMssTabelaVazia();
        // garante exatamente 12 colunas
        const normalized = base.map((r) => ({
          ...r,
          semanas: new Array(12).fill(null).map((_, i) => Number(r.semanas?.[i] ?? 0)),
        }));
        setRows(normalized);
      } catch (e: any) {
        setError(e?.response?.data?.message || "Falha ao carregar a tabela.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const legend = useMemo(
    () => ["Semana 01","Semana 02","Semana 03","Semana 04","Semana 05","Semana 06","Semana 07","Semana 08","Semana 09","Semana 10","Semana 11","Semana 12"],
    []
  );

  function updateCell(ridx: number, cidx: number, v: string) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== ridx) return r;
        const clone = [...r.semanas];
        const num = Number(v.replace(",", "."));
        clone[cidx] = Number.isFinite(num) ? num : 0;
        return { ...r, semanas: clone };
      })
    );
  }

  async function handleClassificar() {
    setLoading(true);
    setError(null);
    try {
      const payload: MssClassificarInItem[] = rows.map((r) => ({
        indicador: r.indicador,
        semanas: (r.semanas || []).slice(0, 12).map((v) => Number(v ?? 0)),
      }));
      const data = await postMssClassificar(payload);
      // mergeia status por indicador
      const byInd: Record<MssIndicador, MssClassificarOutItem> = {} as any;
      data.forEach((d) => (byInd[d.indicador] = d));
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          statusSemanal: byInd[r.indicador]?.statusSemanal ?? new Array(12).fill(undefined),
          // também mantém as semanas “eco” do backend (se ele normalizar)
          semanas: byInd[r.indicador]?.semanas ?? r.semanas,
        }))
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || "Falha ao classificar.");
    } finally {
      setLoading(false);
    }
  }

  const selectedRow = rows[selectedIdx];

  return (
    <div
      style={{
        gridColumn: "span 12",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
        padding: 16,
        display: "grid",
        gridTemplateColumns: "1fr 360px", // tabela + painel lateral
        gap: 14,
        width: "min(1600px, 100%)",
      }}
    >
      {/* coluna esquerda: TABELA */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Mentorado — Tabela de 12 Semanas</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="cv-upload-btn" onClick={handleClassificar} disabled={loading}>
              {loading ? "Processando…" : "Classificar (Ótimo/Bom/Ruim)"}
            </button>
          </div>
        </div>

        {error && <div style={{ color: "#b00020", fontSize: 13, marginTop: 8 }}>{error}</div>}

        <div style={{ border: "1px solid #eee", borderRadius: 10, marginTop: 10, overflow: "hidden" }}>
          <div style={{ background: "#fafafa", padding: "10px 12px", fontWeight: 700 }}>
            Indicadores x Semanas (edite os valores; depois clique em “Classificar”)
          </div>

          <div style={{ maxHeight: 560, overflow: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th
                    style={{
                      padding: "8px 6px",
                      width: 360,
                      position: "sticky",
                      left: 0,
                      background: "#fff",
                      zIndex: 1,
                    }}
                  >
                    Indicador (meta)
                  </th>
                  {legend.map((lbl) => (
                    <th key={lbl} style={{ padding: "8px 6px", fontSize: 12 }}>{lbl}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={1 + legend.length} style={{ padding: "12px 6px", color: "#64748b" }}>
                      Carregando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={1 + legend.length} style={{ padding: "12px 6px", color: "#64748b" }}>
                      Nenhum indicador disponível.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, ridx) => (
                    <tr
                      key={r.indicador}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: selectedIdx === ridx ? "#f8fafc" : "#fff",
                      }}
                      onClick={() => setSelectedIdx(ridx)}
                    >
                      <td
                        style={{
                          padding: "8px 6px",
                          position: "sticky",
                          left: 0,
                          background: selectedIdx === ridx ? "#f8fafc" : "#fff",
                          zIndex: 1,
                          fontSize: 14,
                          color: "#0f172a",
                          cursor: "pointer",
                        }}
                        title={r.indicador}
                      >
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <strong>{LABELS[r.indicador] ?? r.nome}</strong>
                          <span style={{ fontSize: 12, color: "#475569" }}>• meta: {r.meta}</span>
                        </div>
                      </td>

                      {r.semanas.map((v, cidx) => (
                        <td key={cidx} style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input
                              value={Number.isFinite(v) ? String(v) : ""}
                              onChange={(e) => updateCell(ridx, cidx, e.target.value)}
                              onFocus={(e) => e.currentTarget.select()}
                              type="number"
                              step="any"
                              inputMode="decimal"
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                fontSize: 13,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            />
                            <StatusPill s={r.statusSemanal?.[cidx]} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* legenda mínima */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, fontSize: 12, color: "#475569" }}>
          <span>Legenda:</span>
          <StatusPill s={"OTIMO"} />
          <StatusPill s={"BOM"} />
          <StatusPill s={"RUIM"} />
        </div>
      </div>

      {/* coluna direita: PAINEL DE TEXTOS */}
      <aside
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
          height: "fit-content",
          alignSelf: "start",
          position: "sticky",
          top: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <h4 style={{ margin: 0 }}>Detalhes do Indicador</h4>
        </div>

        {!selectedRow ? (
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
            Selecione uma linha da tabela para ver os detalhes.
          </div>
        ) : (
          <>
            <div style={{ marginTop: 6, fontSize: 14, color: "#0f172a" }}>
              <strong>{LABELS[selectedRow.indicador] ?? selectedRow.nome}</strong>{" "}
              <span style={{ color: "#475569" }}>• meta: {selectedRow.meta}</span>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Se Indicador Positivo</div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                {(selectedRow.textos?.positivo || []).map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Se Indicador Negativo</div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                {(selectedRow.textos?.negativo || []).map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Plano de Ação</div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                {(selectedRow.textos?.planoDeAcao || []).map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
