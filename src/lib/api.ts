import axios from "axios"

const TOKEN_KEY = "access_token"

/* -------------------- JWT helpers -------------------- */
function normalizeJwt(raw?: string | null) {
  if (!raw) return null
  const cleaned = raw.replace(/^Bearer\s+/i, "").trim()
  return cleaned.length > 0 ? cleaned : null
}

export function setToken(token: string | null) {
  try {
    const cleaned = normalizeJwt(token)
    if (cleaned) localStorage.setItem(TOKEN_KEY, cleaned)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY) } catch {}
}

export function getToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    const cleaned = normalizeJwt(raw)
    if (cleaned && raw !== cleaned) localStorage.setItem(TOKEN_KEY, cleaned)
    return cleaned
  } catch { return null }
}

export function decodeJwt<T = any>(token?: string | null): T | null {
  if (!token) return null
  try {
    const base = token.split(".")[1]
    const padded = base.padEnd(base.length + ((4 - (base.length % 4)) % 4), "=")
    const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(json)
  } catch { return null }
}

function isExpired(jwt?: string | null) {
  const payload = decodeJwt<any>(jwt)
  const exp = payload?.exp
  if (!exp) return false
  return Math.floor(Date.now() / 1000) >= Number(exp)
}

/* -------------------- URL building -------------------- */
const RAW_URL  = import.meta.env.VITE_API_URL ?? ""
const RAW_BASE = import.meta.env.VITE_API_BASE ?? ""

const API_URL  = RAW_URL.trim().replace(/\/+$/, "")
const API_BASE = RAW_BASE.trim().replace(/^\/+|\/+$/g, "")

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173"

const baseURL = (() => {
  const root = API_URL || ORIGIN.replace(/\/+$/, "")
  const base = API_BASE ? `/${API_BASE}` : ""
  return `${root}${base}`.replace(/\/{2,}/g, "/").replace(":/", "://")
})()

/* -------------------- Axios -------------------- */
export const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: { Accept: "application/json" },
})

api.interceptors.request.use((config) => {
  const jwt = getToken()
  if (jwt && !isExpired(jwt)) {
    config.headers = config.headers ?? {}
    ;(config.headers as any).Authorization = `Bearer ${jwt}`
  }

  const isForm = typeof FormData !== "undefined" && config.data instanceof FormData
  config.headers = config.headers ?? {}
  if (isForm) {
    delete (config.headers as any)["Content-Type"] // deixa o boundary automático
    config.transformRequest = [(d) => d]
  } else {
    ;(config.headers as any)["Content-Type"] =
      (config.headers as any)["Content-Type"] || "application/json"
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err),
)

/* -------------------- Helpers HTTP -------------------- */
export function postForm<T = any>(url: string, form: FormData) {
  return api.post<T>(url, form, { transformRequest: [(d) => d] })
}

/* -------------------- Domain helpers -------------------- */
export type UsuarioResponse = {
  id: string
  nome: string
  email: string
  avatarUrl?: string | null
  mentorado?: {
    id?: string
    tipo?: "Executive" | "First Class"
    curriculo?: { url?: string | null; filename?: string | null } | null
  } | null
}

export type MentoradoResponse = {
  id: string
  usuarioId: string
  mentorId?: string | null
  tipo: "Executive" | "First Class"
  curriculo?: { url?: string | null; filename?: string | null } | null
}

export async function getUsuarioById(id: string) {
  const { data } = await api.get<UsuarioResponse>(`/usuarios/${id}`)
  return data
}

export async function getMentoradoByUsuarioId(usuarioId: string) {
  const { data } = await api.get<MentoradoResponse>(`/mentorados/por-usuario/${usuarioId}`)
  return data
}

export async function createMentoradoMinimal(payload: {
  usuarioId: string
  mentorId?: string | null
  tipo?: "Executive" | "First Class"
}) {
  const body = {
    usuarioId: payload.usuarioId,
    mentorId: payload.mentorId ?? null,
    tipo: payload.tipo ?? "Executive",
  }
  const { data } = await api.post<MentoradoResponse>(`/mentorados`, body)
  return data
}

/** Garante que exista um mentorado para o usuário e retorna o ID. */
export async function ensureMentorado(usuarioId: string) {
  try {
    const found = await getMentoradoByUsuarioId(usuarioId)
    if (found?.id) return found.id
  } catch (_) { /* 404/204 → segue para criar */ }

  try {
    const created = await createMentoradoMinimal({ usuarioId })
    return created?.id
  } catch (err: any) {
    const msg: string = err?.response?.data?.message ?? ""
    const already = /existe|já existe|duplicado|unique/i.test(msg)
    if (already) {
      const found = await getMentoradoByUsuarioId(usuarioId)
      return found?.id
    }
    throw err
  }
}

export async function uploadCurriculo(mentoradoId: string, file: File) {
  const form = new FormData()
  form.append("file", file)
  const { data } = await postForm(`/mentorados/${mentoradoId}/curriculo`, form)
  return data as {
    sucesso: boolean
    storageKey: string
    filename: string
    mime: string
    tamanho: number
    url?: string | null
  }
}
