import { useEffect, useMemo, useState } from "react"
import {
  decodeJwt,
  getToken,
  listCronogramaRotina,
  seedCronograma,
  upsertCronogramaRotina,
  type CronogramaRotinaItem,
} from "../../lib/api"

function pickUserIdFromJwt(jwt?: string | null): string | null {
  const p = decodeJwt<any>(jwt)
  const candidates = [p?.sub, p?.id, p?.userId, p?.uid, p?.usuarioId, p?.user_id]
  const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0)
  return found ? String(found) : null
}

export default function RotinaSemanalFixa(props: { usuarioIdOverride?: string }) {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [itens, setItens] = useState<CronogramaRotinaItem[]>([])

  const usuarioId = useMemo(() => {
    return props.usuarioIdOverride || pickUserIdFromJwt(getToken())
  }, [props.usuarioIdOverride])

  async function carregar() {
    setErro(null)
    setLoading(true)
    try {
      await seedCronograma(usuarioId || undefined).catch(() => ({} as any))
      const data = await listCronogramaRotina(usuarioId || undefined)
      // só FIXA e ativa
      const list = data
        .filter((d) => d.grupo === "FIXA" && d.ativo)
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      setItens(list)
    } catch (e: any) {
      setErro(e?.response?.data?.message || "Falha ao carregar rotina.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [usuarioId])

  async function resetarParaPadrao() {
    try {
      await upsertCronogramaRotina(
        [
          { dia: "Segunda", titulo: "Aplicar para vagas + revisar indicadores", ordem: 1, ativo: true },
          { dia: "Terça",   titulo: "Criar/publicar conteúdo no LinkedIn",      ordem: 2, ativo: true },
          { dia: "Quarta",  titulo: "Networking ativo (novas conexões, interações)", ordem: 3, ativo: true },
          { dia: "Quinta",  titulo: "Participar do Open Room (18h)",            ordem: 4, ativo: true },
          { dia: "Sexta",   titulo: "Revisão da semana + atualização de planilhas", ordem: 5, ativo: true },
        ],
        usuarioId || undefined,
      )
      await carregar()
    } catch (e: any) {
      alert(e?.response?.data?.message || "Falha ao restaurar a rotina.")
    }
  }

  return (
    <div className="mentorados-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ marginTop: 0 }}>Rotina Semanal Fixa</h3>
        <button className="cv-upload-btn" onClick={resetarParaPadrao} title="Restaurar padrão">
          Restaurar
        </button>
      </div>

      {loading && <div style={{ color: "#777", fontSize: 14 }}>Carregando…</div>}
      {erro && (
        <div style={{ color: "#b00020", fontSize: 14, marginTop: 6 }}>
          {erro} <button className="cv-upload-btn" onClick={carregar} style={{ marginLeft: 8 }}>Tentar novamente</button>
        </div>
      )}

      {!loading && !erro && (
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px 16px" }}>
          {itens.map((i) => (
            <div
              key={`${i.dia}-${i.ordem}`}
              style={{
                display: "contents",
              }}
            >
              <div style={{ fontWeight: 600 }}>{i.dia}:</div>
              <div>{i.titulo}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
