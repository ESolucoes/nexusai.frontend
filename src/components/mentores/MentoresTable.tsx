import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { api, getToken } from "../../lib/api"
import "../../styles/mentores/mentores-table.css"

type Vigencia = {
  ativo?: boolean | null
  inicio?: string | null
  fim?: string | null
}

type MentorItem = {
  id: string
  usuarioId: string
  nome: string
  email: string
  telefone: string | null
  tipo: "admin" | "normal"
  mentorados?: number | null
  ativo?: boolean | null
  vigente?: boolean | null
  statusAtivo?: boolean | null
  status?: "ativada" | "desativada" | string | null
  vigenciaAtiva?: boolean | null
  vigencias?: Vigencia[] | null
}

type PaginatedMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

type MentoresResponse = {
  items: MentorItem[]
  meta: PaginatedMeta
}

export type MentoresTableProps = {
  refreshKey?: number
}

/** 🔧 Normaliza URLs relativas vindas do backend para absolutas (baseada no api.baseURL) */
function resolveImageUrl(u?: string | null): string | null {
  if (!u) return null
  if (/^https?:\/\//i.test(u)) return u
  const base = (api?.defaults?.baseURL || "").replace(/\/+$/, "")
  const path = String(u).replace(/^\/+/, "")
  if (!base) return `/${path}`
  return `${base}/${path}`
}

function useDebounce<T>(value: T, ms = 500) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function isAtivoHeuristico(m: MentorItem): boolean {
  if (typeof m?.status === "string") {
    const s = m.status.toLowerCase()
    if (s === "ativada") return true
    if (s === "desativada") return false
  }
  if (m?.vigenciaAtiva === true) return true
  if (m?.statusAtivo === true) return true
  if (m?.vigente === true) return true
  if (m?.ativo === true) return true
  if (Array.isArray(m?.vigencias) && m.vigencias.length > 0) {
    for (const v of m.vigencias) {
      const ativo = v?.ativo === true
      const semFim = v?.fim == null || String(v.fim).trim() === ""
      if (ativo && semFim) return true
    }
  }
  return false
}

function resolveAtivo(m: MentorItem, override?: boolean | null): boolean {
  if (typeof override === "boolean") return override
  return isAtivoHeuristico(m)
}

async function mapWithConcurrency<T, R>(
  list: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(list.length) as R[]
  let i = 0
  const runners = new Array(Math.min(limit, list.length)).fill(0).map(async () => {
    while (i < list.length) {
      const idx = i++
      results[idx] = await worker(list[idx], idx)
    }
  })
  await Promise.all(runners)
  return results
}

function decodeJwt<T = any>(token?: string | null): T | null {
  if (!token) return null
  try {
    const base = token.split(".")[1]
    const padded = base.padEnd(base.length + ((4 - (base.length % 4)) % 4), "=")
    const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export default function MentoresTable({ refreshKey }: MentoresTableProps) {
  const navigate = useNavigate()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    const token = getToken?.()
    const payload = decodeJwt<any>(token)
    const uid = payload?.sub || payload?.id || payload?.userId || payload?.uid || payload?.usuarioId || null
    setCurrentUserId(uid ?? null)
  }, [])

  const [busca, setBusca] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [data, setData] = useState<MentoresResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({})
  const [vigenciaMap, setVigenciaMap] = useState<Record<string, boolean>>({})
  const [vigStatusLoading, setVigStatusLoading] = useState(false)
  /** avatar por usuário (mentor) */
  const [mentorAvatarMap, setMentorAvatarMap] = useState<Record<string, string>>({})

  const dBusca = useDebounce(busca, 400)
  const dPage = useDebounce(page, 100)
  const dLimit = useDebounce(limit, 100)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (dBusca) {
      params.set("nome", dBusca)
      params.set("email", dBusca)
      params.set("telefone", dBusca)
      const q = dBusca.trim().toLowerCase()
      if (q === "admin" || q === "normal") params.set("tipo", q)
    }
    params.set("page", String(dPage > 0 ? dPage : 1))
    params.set("limit", String(dLimit > 0 ? dLimit : 20))
    return params.toString()
  }, [dBusca, dPage, dLimit])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setVigenciaMap({})
    setMentorAvatarMap({})

    api
      .get<MentoresResponse>(`/usuarios/mentores?${query}`, { signal: controller.signal })
      .then(({ data }) => setData(data))
      .catch((e: any) => {
        if (axios.isCancel?.(e) || e?.code === "ERR_CANCELED" || e?.name === "CanceledError" || e?.message === "canceled") return
        const d = e?.response?.data
        const msg =
          (Array.isArray(d?.message) ? d.message.join(" | ") : d?.message) ||
          d?.error ||
          e?.message ||
          "Erro ao carregar mentores"
        setError(msg)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [query, refreshKey])

  useEffect(() => {
    const lista = data?.items ?? []
    if (lista.length === 0) return
    let canceled = false
    setVigStatusLoading(true)
    ;(async () => {
      try {
        const results = await mapWithConcurrency(lista, 6, async (m) => {
          try {
            const { data: vigs } = await api.get<Vigencia[]>(`/vigencias/${m.usuarioId}`)
            const ativo = Array.isArray(vigs) && vigs.some((v) => v && (v.fim == null || String(v.fim).trim() === ""))
            return { id: m.usuarioId, ativo }
          } catch {
            return { id: m.usuarioId, ativo: undefined as unknown as boolean }
          }
        })
        if (canceled) return
        const next: Record<string, boolean> = {}
        for (const r of results) {
          if (typeof r.ativo === "boolean") next[r.id] = r.ativo
        }
        setVigenciaMap(next)
      } finally {
        if (!canceled) setVigStatusLoading(false)
      }
    })()
    return () => { canceled = true }
  }, [data?.items])

  /** 🔄 Carrega os avatares reais dos mentores (sem tirar nada do código original) */
  useEffect(() => {
    const lista = data?.items ?? []
    if (lista.length === 0) return
    let canceled = false
    ;(async () => {
      try {
        const res = await mapWithConcurrency(lista, 6, async (m) => {
          try {
            const { data: u } = await api.get<{ avatarUrl?: string | null; foto?: string | null }>(`/usuarios/${m.usuarioId}`)
            const resolved = resolveImageUrl(u?.avatarUrl ?? u?.foto ?? null)
            return { id: m.usuarioId, url: resolved || "" }
          } catch {
            return { id: m.usuarioId, url: "" }
          }
        })
        if (canceled) return
        const map: Record<string, string> = {}
        for (const r of res) {
          if (r.url) map[r.id] = r.url
        }
        setMentorAvatarMap(map)
      } catch {
        if (!canceled) setMentorAvatarMap({})
      }
    })()
    return () => { canceled = true }
  }, [data?.items])

  const clearSearch = () => {
    setBusca("")
    setPage(1)
  }

  const toggleStatus = async (mentor: MentorItem) => {
    const usuarioId = mentor.usuarioId
    const atual = resolveAtivo(mentor, vigenciaMap[usuarioId])
    setRowLoading((s) => ({ ...s, [usuarioId]: true }))
    try {
      const { data: resp } = await api.patch<{ status?: "ativada" | "desativada" | string }>(
        `/vigencias/${usuarioId}/switch`,
        { ativo: !atual }
      )
      const respStatus = String(resp?.status ?? "").toLowerCase()
      const novoAtivo =
        respStatus === "ativada" ? true :
        respStatus === "desativada" ? false :
        !atual
      setVigenciaMap((m) => ({ ...m, [usuarioId]: novoAtivo }))
    } catch (e: any) {
      const d = e?.response?.data
      const msg =
        (Array.isArray(d?.message) ? d.message.join(" | ") : d?.message) ||
        d?.error ||
        e?.message ||
        "Erro ao alternar status"
      alert(msg)
    } finally {
      setRowLoading((s) => ({ ...s, [usuarioId]: false }))
    }
  }

  const onOpenProfile = (m: MentorItem) => {
    if (!m?.usuarioId) return
    if (currentUserId && String(currentUserId) === String(m.usuarioId)) return
    navigate(`/mentores/${m.usuarioId}`)
  }

  return (
    <div className="mentores-card glass">
      <div className="mentores-search-bar">
        <input
          className="mentores-search-input"
          placeholder="Pesquisar por nome, e-mail, telefone ou tipo (admin/normal)"
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setPage(1) }}
        />
        {busca && (
          <button className="mentores-btn outline" onClick={clearSearch}>
            Limpar
          </button>
        )}
      </div>

      <div className="mentores-table-container">
        <table className="mentores-table">
          <thead>
            <tr>
              <th></th>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Mentorados</th>
              <th>Status {vigStatusLoading ? <small style={{opacity:.7}}>(sincronizando…)</small> : null}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6}><div className="loading">Carregando…</div></td></tr>
            )}
            {error && !loading && (
              <tr><td colSpan={6}><div className="error">{error}</div></td></tr>
            )}
            {!loading && !error && (data?.items?.length ?? 0) === 0 && (
              <tr><td colSpan={6}><div className="empty">Nenhum mentor encontrado.</div></td></tr>
            )}
            {!loading && !error && (data?.items ?? []).map((m) => {
              const usuarioId = m.usuarioId
              const ativo = resolveAtivo(m, vigenciaMap[usuarioId])
              const isRowLoading = !!rowLoading[usuarioId]
              const isSelf = currentUserId && String(currentUserId) === String(usuarioId)
              const avatarSrc = mentorAvatarMap[usuarioId] || "/images/avatar.png"

              return (
                <tr
                  key={m.id}
                  className={!isSelf ? "row-clickable" : undefined}
                  onClick={() => { if (!isSelf) onOpenProfile(m) }}
                  style={{ cursor: !isSelf ? "pointer" : "default" }}
                  title={!isSelf ? "Abrir perfil do mentor" : "Seu usuário (perfil próprio)"}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <img
                      src={avatarSrc}
                      alt={m.nome}
                      className="mentor-avatar"
                      draggable={false}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement
                        if (
                          img.src !== window.location.origin + "/images/avatar.png" &&
                          img.src !== "/images/avatar.png"
                        ) {
                          img.src = "/images/avatar.png"
                        }
                      }}
                    />
                  </td>
                  <td title={m.nome}>
                    <span className={`tipo-badge ${m.tipo === "admin" ? "admin" : "normal"}`}>
                      {m.tipo === "admin" ? "Admin" : "Normal"}
                    </span>{" "}
                    {m.nome}
                  </td>
                  <td title={m.email}>{m.email}</td>
                  <td title={m.telefone ?? ""}>{m.telefone ?? "-"}</td>
                  <td style={{ textAlign: "center", fontWeight: 600 }}>{m.mentorados ?? 0}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <label className={`switch ${isRowLoading ? "switch--loading" : ""}`}>
                      <input
                        type="checkbox"
                        checked={!!ativo}
                        onChange={() => toggleStatus(m)}
                        disabled={isRowLoading}
                      />
                      <span className="slider" />
                    </label>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mentores-pagination">
        <div className="pager-left">
          <button disabled={(data?.meta.page ?? page) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>◀ Anterior</button>
          <span>Página {data?.meta.page ?? page} de {data?.meta.totalPages ?? 1}</span>
          <button disabled={(data?.meta.page ?? page) >= (data?.meta.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>Próxima ▶</button>
        </div>
        <div className="pager-right">
          <label>
            Itens:
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <span>Total: {data?.meta.total ?? 0}</span>
        </div>
      </div>
    </div>
  )
}
