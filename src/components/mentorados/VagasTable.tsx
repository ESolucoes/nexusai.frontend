// frontend/src/components/mentorados/VagasModal.tsx
import { useEffect, useState } from "react";
import { 
  listMyVagaLinks, 
  createMyVagaLink, 
  removeMyVagaLink, 
  type VagaLink 
} from "../../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  pageSize?: number;
};

export default function VagasModal({ open, onClose, pageSize = 10 }: Props) {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<VagaLink[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const quantidade = pageSize;

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await listMyVagaLinks(pagina, quantidade);
      setItens(res.itens);
      setTotal(res.total);
    } catch (error: any) {
      setErr("Falha ao carregar vagas");
      console.error("Erro ao carregar vagas:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open, pagina, quantidade]);

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
      await createMyVagaLink({ url: normalized });
      setUrl("");
      
      // Se está na primeira página, recarrega
      // Senão, vai para a primeira página para ver o novo item
      if (pagina === 1) {
        await load();
      } else {
        setPagina(1);
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Falha ao salvar o link.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Tem certeza que deseja remover esta vaga?")) {
      return;
    }

    setRemoving(id);
    setErr(null);
    
    try {
      await removeMyVagaLink(id);
      await load(); // Recarrega a lista
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Falha ao remover a vaga");
    } finally {
      setRemoving(null);
    }
  }

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(800px, 95vw)",
          maxHeight: "85vh",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #eee" }}>
          <h3 style={{ margin: 0 }}>Links de Vagas</h3>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 20,
              lineHeight: 1,
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>
        </div>

        {/* Formulário de adicionar nova vaga */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f2f2f2" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
            <input
              autoFocus
              type="text"
              placeholder="Cole o link da vaga (ex: https://...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => (e.key === "Enter" ? handleSave() : undefined)}
              style={{
                flex: 1,
                minWidth: "200px",
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                fontSize: 14,
              }}
            />
            <button 
              className="cv-upload-btn blue-btn" 
              onClick={handleSave} 
              disabled={saving}
              style={{ minWidth: "100px" }}
            >
              {saving ? "Salvando..." : "Adicionar"}
            </button>
          </div>
          {err && <div style={{ color: "#b00020", fontSize: 13, marginTop: 8 }}>{err}</div>}
        </div>

        {/* Lista de vagas */}
        <div style={{ flex: 1, overflow: "auto", padding: "0 20px" }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "#666" }}>Carregando…</div>
          ) : itens.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#666" }}>
              Nenhum link cadastrado. Adicione o primeiro link acima.
            </div>
          ) : (
            <div style={{ padding: "16px 0" }}>
              {itens.map((v) => (
                <div
                  key={v.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid #f5f5f5",
                  }}
                >
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      color: "#0d6efd",
                      textDecoration: "none",
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={v.titulo || v.url}
                  >
                    {v.titulo || v.url}
                  </a>
                  
                  <span style={{ fontSize: 12, color: "#666", marginLeft: 12, minWidth: "80px" }}>
                    {new Date(v.criadoEm).toLocaleDateString()}
                  </span>
                  
                  <button
                    onClick={() => handleRemove(v.id)}
                    disabled={removing === v.id}
                    style={{
                      marginLeft: 12,
                      padding: "6px 10px",
                      fontSize: 12,
                      background: removing === v.id ? "#6c757d" : "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: removing === v.id ? "not-allowed" : "pointer",
                      minWidth: "60px",
                    }}
                    title="Remover vaga"
                  >
                    {removing === v.id ? "..." : "Remover"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paginação */}
        {itens.length > 0 && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 14, color: "#666" }}>
              Total: {total} {total === 1 ? 'item' : 'itens'}
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                disabled={pagina <= 1}
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #ddd",
                  background: pagina <= 1 ? "#f5f5f5" : "#fff",
                  color: pagina <= 1 ? "#999" : "#333",
                  borderRadius: 6,
                  cursor: pagina <= 1 ? "not-allowed" : "pointer",
                }}
              >
                {"<"}
              </button>
              <span style={{ fontSize: 14, color: "#666", minWidth: "60px", textAlign: "center" }}>
                {pagina} / {totalPaginas}
              </span>
              <button
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #ddd",
                  background: pagina >= totalPaginas ? "#f5f5f5" : "#fff",
                  color: pagina >= totalPaginas ? "#999" : "#333",
                  borderRadius: 6,
                  cursor: pagina >= totalPaginas ? "not-allowed" : "pointer",
                }}
              >
                {">"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}