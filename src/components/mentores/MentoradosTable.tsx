// frontend/src/components/mentores/MentoradosTable.tsx
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { api } from "../../lib/api"
import "../../styles/mentores/mentores-table.css"

type MentoradoItem = {
  id: string
  nome: string
  email: string
  telefone: string | null
  tipo: "Executive" | "First Class"
  rg: string
  cpf: string
  criadoEm: string
  atualizadoEm: string
}

type PaginatedMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

type MentoradosResponse = {
  items: MentoradoItem[]
  meta: PaginatedMeta
}

type UsuarioDetalhe = {
  id: string
  mentorado?: {
    mentor?: {
      usuario?: {
        nome?: string
        email?: string
        avatar?: string | null
        foto?: string | null
      } | null
    } | null
  } | null
  vigenciaAtiva?: any | null
}

export type MentoradosTableProps = {
  refreshKey?: number
  showMentorColumn?: boolean
  enableVigenciaSwitch?: boolean
}

function useDebounce<T>(value: T, ms = 500) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

type MentorInfo = {
  nome?: string
  email?: string
  avatar?: string | null
}

export default function MentoradosTable({
  refreshKey,
  showMentorColumn,
  enableVigenciaSwitch,
}: MentoradosTableProps) {
  const navigate = useNavigate()

  const [busca, setBusca] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [data, setData] = useState<MentoradosResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mentorCol, setMentorCol] = useState<Record<string, MentorInfo>>({})
  const [vigenciaOn, setVigenciaOn] = useState<Record<string, boolean>>({})
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({})

  const dBusca = useDebounce(busca, 400)
  const dPage = useDebounce(page, 100)
  const dLimit = useDebounce(limit, 100)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (dBusca) {
      params.set("nome", dBusca)
      params.set("email", dBusca)
      params.set("telefone", dBusca)
      params.set("cpf", dBusca)
      params.set("rg", dBusca)
      if (dBusca.toLowerCase() === "executive" || dBusca.toLowerCase() === "first class") {
        params.set("tipo", dBusca)
      }
    }
    params.set("page", String(dPage > 0 ? dPage : 1))
    params.set("limit", String(dLimit > 0 ? dLimit : 20))
    return params.toString()
  }, [dBusca, dPage, dLimit])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    api
      .get<MentoradosResponse>(`/usuarios/mentorados?${query}`, { signal: controller.signal })
      .then(({ data }) => setData(data))
      .catch((e: any) => {
        if (axios.isCancel(e) || e?.code === "ERR_CANCELED" || e?.message === "canceled") return
        const d = e?.response?.data
        const msg =
          (Array.isArray(d?.message) ? d.message.join(" | ") : d?.message) ||
          d?.error ||
          e?.message ||
          "Erro ao carregar mentorados"
        setError(msg)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [query, refreshKey])

  useEffect(() => {
    const items = data?.items ?? []
    if (items.length === 0) {
      setMentorCol({})
      setVigenciaOn({})
      setRowLoading({})
      return
    }
    let canceled = false
    ;(async () => {
      try {
        const detalhes = await Promise.all(
          items.map((it) =>
            api
              .get<UsuarioDetalhe>(`/usuarios/${it.id}`)
              .then((res) => ({ id: it.id, data: res.data }))
              .catch(() => ({ id: it.id, data: null as any }))
          )
        )
        if (canceled) return
        const m: Record<string, MentorInfo> = {}
        const v: Record<string, boolean> = {}
        for (const d of detalhes) {
          const u = d.data?.mentorado?.mentor?.usuario
          m[d.id] = {
            nome: u?.nome,
            email: u?.email,
            avatar: u?.avatar ?? u?.foto ?? null,
          }
          v[d.id] = Boolean(d.data?.vigenciaAtiva)
        }
        setMentorCol(m)
        setVigenciaOn(v)
      } catch {
        if (!canceled) {
          setMentorCol({})
          setVigenciaOn({})
        }
      }
    })()
    return () => { canceled = true }
  }, [data?.items])

  const totalPages = data?.meta.totalPages ?? 1
  const canPrev = (data?.meta.page ?? page) > 1
  const canNext = (data?.meta.page ?? page) < totalPages

  const onChangeLimit = (val: number) => {
    setLimit(val)
    setPage(1)
  }

  const clearSearch = () => {
    setBusca("")
    setPage(1)
  }

  async function toggleVigencia(usuarioId: string, ativo: boolean) {
    setRowLoading((s) => ({ ...s, [usuarioId]: true }))
    const prev = vigenciaOn[usuarioId]
    setVigenciaOn((s) => ({ ...s, [usuarioId]: ativo }))
    try {
      await api.patch(`/vigencias/${usuarioId}/switch`, { ativo })
    } catch (e: any) {
      setVigenciaOn((s) => ({ ...s, [usuarioId]: prev }))
      const d = e?.response?.data
      const msg =
        (Array.isArray(d?.message) ? d.message.join(" | ") : d?.message) ||
        d?.error ||
        e?.message ||
        "Erro ao alternar vigência"
      alert(msg)
    } finally {
      setRowLoading((s) => ({ ...s, [usuarioId]: false }))
    }
  }

  const colSpan = useMemo(() => {
    return 7 + (showMentorColumn ? 1 : 0)
  }, [showMentorColumn])

  return (
    <div className="mentores-card glass">
      <div className="mentores-search-bar">
        <input
          className="mentores-search-input"
          placeholder="Pesquisar por nome, e-mail, telefone, RG ou CPF"
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
              {showMentorColumn && <th>Mentor</th>}
              <th>Telefone</th>
              <th>RG</th>
              <th>CPF</th>
              <th>Vigência</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={colSpan}><div className="loading">Carregando…</div></td></tr>
            )}
            {error && !loading && (
              <tr><td colSpan={colSpan}><div className="error">{error}</div></td></tr>
            )}
            {!loading && !error && (data?.items?.length ?? 0) === 0 && (
              <tr><td colSpan={colSpan}><div className="empty">Nenhum mentorado encontrado.</div></td></tr>
            )}
            {!loading && !error && (data?.items ?? []).map((m) => {
              const mentorInfo = mentorCol[m.id]
              const mentorAvatar = mentorInfo?.avatar || "/images/avatar.png"
              const mentorNome = mentorInfo?.nome
              const mentorEmail = mentorInfo?.email
              return (
                <tr
                  key={m.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/mentores/home/mentorado?id=${encodeURIComponent(m.id)}`)}
                  title="Abrir página do mentorado"
                >
                  <td>
                    <img src="/images/avatar.png" alt={m.nome} className="mentor-avatar" draggable={false} />
                  </td>
                  <td>
                    <span className={`tipo-badge ${m.tipo === "Executive" ? "admin" : "normal"}`} style={{ marginRight: 8 }}>
                      {m.tipo}
                    </span>
                    {m.nome}
                  </td>
                  <td>{m.email}</td>
                  {showMentorColumn && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <img
                          src={mentorAvatar}
                          alt={mentorNome || "Mentor"}
                          className="mentor-avatar"
                          draggable={false}
                          style={{ width: 28, height: 28, borderRadius: "9999px", objectFit: "cover" }}
                        />
                        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                          <span title={mentorNome || ""}>{mentorNome || "-"}</span>
                          <small title={mentorEmail || ""} style={{ opacity: .8 }}>{mentorEmail || ""}</small>
                        </div>
                      </div>
                    </td>
                  )}
                  <td>{m.telefone ?? "-"}</td>
                  <td>{m.rg}</td>
                  <td>{m.cpf}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {enableVigenciaSwitch ? (
                      <label className={`switch ${rowLoading[m.id] ? "switch--loading" : ""}`}>
                        <input
                          type="checkbox"
                          checked={!!vigenciaOn[m.id]}
                          onChange={(e) => toggleVigencia(m.id, e.target.checked)}
                          disabled={!!rowLoading[m.id]}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="slider" />
                      </label>
                    ) : (
                      <span>{vigenciaOn[m.id] ? "Ativa" : "Inativa"}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mentores-pagination">
        <div className="pager-left">
          <button disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>◀ Anterior</button>
          <span>Página {data?.meta.page ?? page} de {data?.meta.totalPages ?? 1}</span>
          <button disabled={!canNext} onClick={() => setPage((p) => p + 1)}>Próxima ▶</button>
        </div>
        <div className="pager-right">
          <label>
            Itens:
            <select value={limit} onChange={(e) => onChangeLimit(Number(e.target.value))}>
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
