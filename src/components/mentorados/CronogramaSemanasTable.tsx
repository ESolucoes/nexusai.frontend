import { useEffect, useMemo, useState } from "react"
import {
  decodeJwt,
  getToken,
  listCronogramaSemanas,
  seedCronograma,
  updateCronogramaSemana,
} from "../../lib/api"

type Grupo = {
  semana: string
  meta: string
  tarefas: Array<{ id: string; tarefa: string; ordem: number; concluido: boolean }>
}

function pickUserIdFromJwt(jwt?: string | null): string | null {
  const p = decodeJwt<any>(jwt)
  const candidates = [p?.sub, p?.id, p?.userId, p?.uid, p?.usuarioId, p?.user_id]
  const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0)
  return found ? String(found) : null
}

export default function CronogramaSemanasTable(props: { usuarioIdOverride?: string }) {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<Grupo[]>([])

  const usuarioId = useMemo(() => {
    return props.usuarioIdOverride || pickUserIdFromJwt(getToken())
  }, [props.usuarioIdOverride])

  async function carregar() {
    setErro(null)
    setLoading(true)
    try {
      // garante que existem dados base
      await seedCronograma(usuarioId || undefined).catch(() => ({} as any))
      const data = await listCronogramaSemanas(usuarioId || undefined)
      const parsed: Grupo[] = Object.entries(data).map(([semana, val]) => ({
        semana,
        meta: val.meta,
        tarefas: [...val.tarefas].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
      }))
      // manter ordem natural: Semana 1, Semana 2 a 4, ...
      parsed.sort((a, b) => a.semana.localeCompare(b.semana, "pt-BR", { numeric: true }))
      setGrupos(parsed)
    } catch (e: any) {
      setErro(e?.response?.data?.message || "Falha ao carregar cronograma.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [usuarioId])

  async function toggleConcluido(itemId: string, val: boolean) {
    try {
      await updateCronogramaSemana(itemId, { concluido: val })
      // Atualiza local (optimistic)
      setGrupos((prev) =>
        prev.map((g) => ({
          ...g,
          tarefas: g.tarefas.map((t) => (t.id === itemId ? { ...t, concluido: val } : t)),
        })),
      )
    } catch (e: any) {
      alert(e?.response?.data?.message || "Falha ao atualizar o item.")
    }
  }

  if (loading) {
    return (
      <div className="mentorados-card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Cronograma de Atividades</h3>
        <div style={{ color: "#777", fontSize: 14 }}>Carregando…</div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="mentorados-card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Cronograma de Atividades</h3>
        <div style={{ color: "#b00020", fontSize: 14, marginBottom: 8 }}>{erro}</div>
        <button className="cv-upload-btn" onClick={carregar}>Tentar novamente</button>
      </div>
    )
  }

  return (
    <div className="mentorados-card" style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Cronograma de Atividades (8 semanas)</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {grupos.map((g) => (
          <div key={g.semana} style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ background: "#fafafa", padding: "10px 12px", borderBottom: "1px solid #eee" }}>
              <div style={{ fontWeight: 600 }}>{g.semana}</div>
              <div style={{ fontSize: 13, color: "#666" }}>{g.meta}</div>
            </div>
            <div style={{ padding: 12 }}>
              {g.tarefas.map((t) => (
                <label
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 0",
                    borderBottom: "1px dashed #f0f0f0",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!t.concluido}
                    onChange={(e) => toggleConcluido(t.id, e.target.checked)}
                  />
                  <span style={{ textDecoration: t.concluido ? "line-through" : "none" }}>
                    {t.tarefa}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
