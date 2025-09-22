// frontend/src/components/ssi/SsiDashboardTabela.tsx
import { useEffect, useMemo, useState } from "react";
import {
  getSsiDashboardTabela,
  type SsiDashboardTabela,
  type SsiMetrica,
  type SsiUnidade,
} from "../../lib/api";
import SsiSemanaModal from "../mentorados/SsiSemanaModal";

/** Labels amigáveis por métrica */
const METRIC_LABEL: Record<SsiMetrica, string> = {
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
  TAXA_RECRUTADORES: "Taxa de Recrutadores que viram seu perfil",
  CANDIDATURAS_SIMPLIFICADAS: "Candidaturas Simplificadas",
  CANDIDATURAS_VISUALIZADAS: "Candidaturas Visualizadas",
  CURRICULOS_BAIXADOS: "Currículos Baixados",
  CONTATOS_RH: "Contatos de RH na semana",
  PUBLICACOES_SEMANA: "Publicações na Semana",
  INTERACOES_COMENTARIOS: "Interações via comentários",
  CONTRIBUICOES_ARTIGOS: "Contribuições em Artigos Colaborativos",
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

/** Formata valor conforme unidade */
function fmtValue(v: number | undefined, unidade: SsiUnidade) {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  if (unidade === "PERCENTUAL") return `${Number(v)}`;
  return `${Number(v)}`;
}

export default function SsiDashboardTabela() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SsiDashboardTabela | null>(null);

  // filtros opcionais por intervalo (se quiser controlar semanas exibidas)
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");

  // modal de detalhes por semana (reuso do componente atual)
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // carrega tabela (sem filtros inicialmente)
        const tabela = await getSsiDashboardTabela();
        setData(tabela);
      } catch (e: any) {
        setError(e?.response?.data?.message || "Falha ao carregar dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function aplicarFiltro() {
    setLoading(true);
    setError(null);
    try {
      const tabela = await getSsiDashboardTabela({
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
      });
      setData(tabela);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Falha ao filtrar dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const semanas = data?.semanas ?? [];
  const itens = useMemo(() => {
    if (!data?.itens) return [];
    // Garante ordem por label para ficar amigável
    return [...data.itens].sort((a, b) => {
      const la = METRIC_LABEL[a.metrica] ?? a.metrica;
      const lb = METRIC_LABEL[b.metrica] ?? b.metrica;
      return la.localeCompare(lb, "pt-BR");
    });
  }, [data]);

  return (
    <div
      style={{
        gridColumn: "span 12",
        width: "min(1600px, 100%)",
        marginLeft: 0,
        marginRight: 24,
        marginTop: 20,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h3 style={{ margin: 0 }}>Dashboard – Evolução por Semanas</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="cv-upload-btn" onClick={() => setModalOpen(true)}>
            Ver semana (detalhe)
          </button>
        </div>
      </div>

      {/* Filtros por intervalo (opcional) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ width: 120, fontSize: 13, color: "#334155" }}>Data início:</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ width: 120, fontSize: 13, color: "#334155" }}>Data fim:</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
          />
        </div>
        <button className="cv-upload-btn" onClick={aplicarFiltro} disabled={loading}>
          {loading ? "Filtrando…" : "Aplicar filtro"}
        </button>
      </div>

      {error && <div style={{ color: "#b00020", fontSize: 13 }}>{error}</div>}

      {/* SOMENTE A TABELA scrolla na vertical */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#fafafa",
            padding: "10px 12px",
            fontWeight: 700,
          }}
        >
          Evolução semanal (linhas = métricas, colunas = semanas)
        </div>

        {/* container com scroll vertical; horizontal travado */}
        <div
          style={{
            maxHeight: 520,           // ajuste fino aqui
            overflowY: "auto",
            overflowX: "hidden",      // evita scroll horizontal
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",   // ajuda a não gerar scroll horizontal
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th
                  style={{
                    padding: "8px 6px",
                    width: 340,                // coluna métrica mais larga
                    position: "sticky",
                    left: 0,
                    background: "#fff",
                    zIndex: 1,
                  }}
                >
                  Métrica
                </th>
                {semanas.map((s) => (
                  <th key={s} style={{ padding: "8px 6px", fontSize: 12 }}>
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={1 + semanas.length} style={{ padding: "12px 6px", color: "#64748b" }}>
                    Carregando…
                  </td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan={1 + semanas.length} style={{ padding: "12px 6px", color: "#64748b" }}>
                    Sem dados para o intervalo selecionado.
                  </td>
                </tr>
              ) : (
                itens.map((row) => (
                  <tr key={row.metrica} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td
                      style={{
                        padding: "8px 6px",
                        position: "sticky",
                        left: 0,
                        background: "#fff",
                        zIndex: 1,
                        fontSize: 14,
                        color: "#0f172a",
                      }}
                      title={row.metrica}
                    >
                      {METRIC_LABEL[row.metrica] ?? row.metrica}
                    </td>
                    {semanas.map((s) => (
                      <td key={s} style={{ padding: "8px 6px", fontVariantNumeric: "tabular-nums" }}>
                        {fmtValue(row.valores[s], row.unidade)}
                        {row.unidade === "PERCENTUAL" ? "%" : ""}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalhes por semana (reuso) */}
      <SsiSemanaModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
