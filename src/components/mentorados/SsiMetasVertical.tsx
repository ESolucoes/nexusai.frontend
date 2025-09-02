// frontend/src/components/mentorados/SsiMetasVertical.tsx
import { useEffect, useMemo, useState } from "react";
import {
  listSsiMetas,
  upsertSsiMetasBatch,
  type SsiMeta,
  type SsiMetrica,
  type SsiUnidade,
} from "../../lib/api";

type Row = {
  metrica: SsiMetrica;
  label: string;
  unidade: SsiUnidade;
  valorMeta: string;
  placeholder?: string;
};

const GROUPS: { title: string; items: Array<Omit<Row, "valorMeta">> }[] = [
  {
    title: "Índices Gerais",
    items: [
      {
        metrica: "SSI_SETOR",
        label: "SSI no seu Setor",
        unidade: "PERCENTUAL",
        placeholder: "1",
      },
      {
        metrica: "SSI_REDE",
        label: "SSI na sua Rede",
        unidade: "PERCENTUAL",
        placeholder: "1",
      },
      {
        metrica: "SSI_TOTAL",
        label: "Social Selling Index",
        unidade: "NUMERO",
        placeholder: "65",
      },
      {
        metrica: "PILAR_MARCA",
        label: "Estabelecer sua Marca Profissional",
        unidade: "NUMERO",
        placeholder: "18",
      },
      {
        metrica: "PILAR_PESSOAS_CERTAS",
        label: "Localizar as Pessoas Certas",
        unidade: "NUMERO",
        placeholder: "15",
      },
      {
        metrica: "PILAR_INSIGHTS",
        label: "Interagir oferecendo Insights",
        unidade: "NUMERO",
        placeholder: "15",
      },
      {
        metrica: "PILAR_RELACIONAMENTOS",
        label: "Cultivar Relacionamentos",
        unidade: "NUMERO",
        placeholder: "15",
      },
    ],
  },
  {
    title: "Alcance & Perfil (LinkedIn)",
    items: [
      {
        metrica: "IMPRESSOES_PUBLICACAO",
        label: "Impressões da Publicação",
        unidade: "NUMERO",
        placeholder: "1000",
      },
      {
        metrica: "VISUALIZACOES_PERFIL",
        label: "Visualizações do Perfil",
        unidade: "NUMERO",
        placeholder: "100",
      },
      {
        metrica: "OCORRENCIAS_PESQUISA",
        label: "Ocorrências em Resultado de Pesquisa",
        unidade: "NUMERO",
        placeholder: "100",
      },
      {
        metrica: "TAXA_RECRUTADORES",
        label: "Taxa de Recrutadores que viram seu perfil",
        unidade: "PERCENTUAL",
        placeholder: "5",
      },
    ],
  },
  {
    title: "Candidaturas & RH",
    items: [
      {
        metrica: "CANDIDATURAS_SIMPLIFICADAS",
        label: "Quantidade de Candidaturas Simplificadas",
        unidade: "NUMERO",
        placeholder: "10",
      },
      {
        metrica: "CANDIDATURAS_VISUALIZADAS",
        label: "Quantidade de Candidaturas Visualizadas",
        unidade: "NUMERO",
        placeholder: "3",
      },
      {
        metrica: "CURRICULOS_BAIXADOS",
        label: "Quantidade de Currículos Baixados",
        unidade: "NUMERO",
        placeholder: "3",
      },
      {
        metrica: "CONTATOS_RH",
        label: "Quantidade de Contatos de RHs na semana",
        unidade: "NUMERO",
        placeholder: "2",
      },
    ],
  },
  {
    title: "Conteúdo & Interações",
    items: [
      {
        metrica: "PUBLICACOES_SEMANA",
        label: "Publicações na Semana",
        unidade: "NUMERO",
        placeholder: "3",
      },
      {
        metrica: "INTERACOES_COMENTARIOS",
        label: "Interações via comentários",
        unidade: "NUMERO",
        placeholder: "10",
      },
      {
        metrica: "CONTRIBUICOES_ARTIGOS",
        label: "Contribuições em Artigos Colaborativos",
        unidade: "NUMERO",
        placeholder: "1",
      },
    ],
  },
  {
    title: "Networking",
    items: [
      {
        metrica: "PEDIDOS_CONEXAO_HEADHUNTERS",
        label: "Pedidos de Conexão com Headhunters",
        unidade: "NUMERO",
        placeholder: "50",
      },
      {
        metrica: "PEDIDOS_CONEXAO_DECISORES",
        label: "Pedidos de Conexão com Decisores",
        unidade: "NUMERO",
        placeholder: "50",
      },
      {
        metrica: "MENSAGENS_RECRUTADORES",
        label: "Mensagens para Recrutadores",
        unidade: "NUMERO",
        placeholder: "10",
      },
      {
        metrica: "MENSAGENS_NETWORKING",
        label: "Mensagens para Networking",
        unidade: "NUMERO",
        placeholder: "10",
      },
      {
        metrica: "CAFES_AGENDADOS",
        label: "Cafés agendados com Networking",
        unidade: "NUMERO",
        placeholder: "2",
      },
      {
        metrica: "CAFES_TOMADOS",
        label: "Cafés Tomados na Semana",
        unidade: "NUMERO",
        placeholder: "1",
      },
    ],
  },
  {
    title: "Processos",
    items: [
      {
        metrica: "ENTREVISTAS_REALIZADAS",
        label: "Entrevistas Realizadas",
        unidade: "NUMERO",
        placeholder: "2",
      },
      {
        metrica: "ENTREVISTAS_FASE_FINAL",
        label: "Entrevistas em Fase Final",
        unidade: "NUMERO",
        placeholder: "1",
      },
      {
        metrica: "CARTAS_OFERTA",
        label: "Cartas Ofertas Recebida",
        unidade: "NUMERO",
        placeholder: "1",
      },
    ],
  },
];

function flatRowsTemplate(): Row[] {
  return GROUPS.flatMap((g) =>
    g.items.map((i) => ({
      ...i,
      valorMeta: "",
    }))
  );
}

export default function SsiMetasVertical() {
  const [rows, setRows] = useState<Row[]>(flatRowsTemplate());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recalcular, setRecalcular] = useState(false);

  const byMetrica = useMemo(() => {
    const map = new Map<SsiMetrica, Row>();
    rows.forEach((r) => map.set(r.metrica, r));
    return map;
  }, [rows]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const metas = await listSsiMetas();
        setRows((prev) =>
          prev.map((r) => {
            const found = metas.find((m: SsiMeta) => m.metrica === r.metrica);
            if (!found) return r;
            return {
              ...r,
              valorMeta: found.valorMeta ?? "",
              unidade: found.unidade as SsiUnidade,
            };
          })
        );
      } catch (e: any) {
        setError(e?.response?.data?.message || "Falha ao carregar metas.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function setValue(metrica: SsiMetrica, next: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => (r.metrica === metrica ? { ...r, ...next } : r))
    );
  }

  async function handleSaveAll() {
    setSaving(true);
    setError(null);
    try {
      const itens = rows
        .map((r) => ({
          metrica: r.metrica,
          unidade: r.unidade,
          valorMeta:
            r.valorMeta === ""
              ? Number.NaN
              : Number(String(r.valorMeta).replace(",", ".")),
        }))
        .filter((i) => !Number.isNaN(i.valorMeta));
      if (!itens.length) {
        setError("Informe pelo menos uma meta.");
        setSaving(false);
        return;
      }
      await upsertSsiMetasBatch(itens, recalcular);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Falha ao salvar metas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="ssi-vertical-card"
      style={{
        gridColumn: "span 12",
        width: "min(750px, 100%)",
        marginLeft: "auto", // empurra para a direita
        marginRight: 24, // "padding" da borda direita
        marginTop: 100, // desce um pouco
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>Metas do SSI (vertical)</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 13, color: "#555" }}>
            <input
              type="checkbox"
              checked={recalcular}
              onChange={(e) => setRecalcular(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Recalcular históricos
          </label>
          <button
            className="cv-upload-btn"
            onClick={handleSaveAll}
            disabled={saving || loading}
          >
            {saving ? "Salvando..." : "Salvar metas"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#666", padding: "8px 2px" }}>Carregando…</div>
      ) : (
        <>
          {GROUPS.map((g) => (
            <div
              key={g.title}
              style={{
                border: "1px solid #eee",
                borderRadius: 10,
                marginTop: 12,
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
                {g.title}
              </div>
              <div style={{ padding: 6 }}>
                {g.items.map((item) => {
                  const r = byMetrica.get(item.metrica)!;
                  return (
                    <div
                      key={item.metrica}
                      style={{
                        display: "grid",
                        /* ↓↓↓ deixa as colunas mais estreitas para caber no card ↓↓↓ */
                        gridTemplateColumns: "minmax(180px, 1fr) 100px 120px",
                        gap: 10,
                        alignItems: "center",
                        padding: "8px 6px",
                        borderBottom: "1px solid #f2f2f2",
                      }}
                    >
                      <div style={{ fontSize: 14, color: "#0f172a" }}>
                        {item.label}
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder={item.placeholder}
                        value={r?.valorMeta ?? ""}
                        onChange={(e) =>
                          setValue(item.metrica, { valorMeta: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          border: "1px solid #ddd",
                          borderRadius: 8,
                          fontSize: 14,
                        }}
                      />
                      <select
                        value={r?.unidade ?? "NUMERO"}
                        onChange={(e) =>
                          setValue(item.metrica, {
                            unidade: e.target.value as SsiUnidade,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          border: "1px solid #ddd",
                          borderRadius: 8,
                          fontSize: 14,
                          background: "#fff",
                        }}
                      >
                        <option value="NUMERO">Número</option>
                        <option value="PERCENTUAL">Percentual</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {error && (
            <div style={{ color: "#b00020", marginTop: 10, fontSize: 13 }}>
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
