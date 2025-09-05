// frontend/src/components/mentorados/VagasTable.tsx
import { useEffect, useState } from "react";
import { listMyVagaLinks, createMyVagaLink, type VagaLink } from "../../lib/api";

type Props = { pageSize?: number };

export default function VagasTable({ pageSize = 10 }: Props) {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<VagaLink[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const quantidade = pageSize;

  // modal
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await listMyVagaLinks(pagina, quantidade);
      setItens(res.itens);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, quantidade]);

  const totalPaginas = Math.max(1, Math.ceil(total / quantidade));

  function normalizeUrl(raw: string) {
    const s = (raw || "").trim();
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) return `https://${s}`;
    return s;
  }

  async function handleSave() {
    const normalized = normalizeUrl(url);
    if (!normalized || !/[.]/.test(normalized)) {
      setErr("Informe um link válido.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const novo = await createMyVagaLink({ url: normalized });
      if (pagina === 1) {
        setItens((prev) => [novo, ...prev]);
        setTotal((t) => t + 1);
      } else {
        setPagina(1); // volta pra primeira página pra ver o item novo
      }
      setOpen(false);
      setUrl("");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Falha ao salvar o link.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="vagas-card">
      <div className="vagas-card__header">
        <h4>Links de vagas</h4>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="cv-upload-btn" onClick={() => setOpen(true)}>Novo link</button>
          <div className="vagas-card__pager">
            <button disabled={pagina <= 1} onClick={() => setPagina(p => Math.max(1, p - 1))}>{"<"}</button>
            <span>{pagina} / {totalPaginas}</span>
            <button disabled={pagina >= totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}>{">"}</button>
          </div>
        </div>
      </div>

      <div className="vagas-table__wrap">
        <table className="vagas-table">
          <thead>
            <tr>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
          {loading ? (
            <tr><td className="vagas-table__loading">Carregando…</td></tr>
          ) : itens.length === 0 ? (
            <tr><td className="vagas-table__empty">Nenhum link cadastrado.</td></tr>
          ) : itens.map(v => (
            <tr key={v.id}>
              <td className="vagas-table__link">
                <a href={v.url} target="_blank" rel="noreferrer">{v.url}</a>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      {/* Modal simples */}
      {open && (
        <div
          onClick={() => !saving && setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 520, background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>Novo link de vaga</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                autoFocus
                type="text"
                placeholder="Cole o link da vaga (ex: https://...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => (e.key === "Enter" ? handleSave() : undefined)}
                style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }}
              />
              {err && <div style={{ color: "#b00020", fontSize: 13 }}>{err}</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="cv-upload-btn" onClick={() => setOpen(false)} disabled={saving}>Cancelar</button>
                <button className="cv-upload-btn" onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
