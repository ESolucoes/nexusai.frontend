import axios from "axios"

const TOKEN_KEY = "access_token"

/* -------------------- JWT helpers -------------------- */
function normalizeJwt(raw?: string | null) {
  if (!raw) return null
  const cleaned = raw.replace(/^Bearer\s+/i, "").trim()
  return cleaned.length > 0 ? cleaned : null
}
export function setToken(token: string | null) {
  try { const c = normalizeJwt(token); if (c) localStorage.setItem(TOKEN_KEY, c); else localStorage.removeItem(TOKEN_KEY) } catch {}
}
export function clearToken() { try { localStorage.removeItem(TOKEN_KEY) } catch {} }
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

/* -------------------- URL helpers -------------------- */
const RAW_URL  = import.meta.env.VITE_API_URL ?? ""
const RAW_BASE = import.meta.env.VITE_API_BASE ?? ""
const API_URL  = RAW_URL.trim().replace(/\/+$/, "")
const API_BASE = RAW_BASE.trim().replace(/^\/+|\/+$/g, "")
const ORIGIN = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173"

export const baseURL = (() => {
  const root = API_URL || ORIGIN.replace(/\/+$/, "")
  const base = API_BASE ? `/${API_BASE}` : ""
  return `${root}${base}`.replace(/\/{2,}/g, "/").replace(":/", "://")
})()

function joinUrl(root: string, path: string) {
  const r = root.replace(/\/+$/, "")
  const p = path.replace(/^\/+/, "")
  return `${r}/${p}`.replace(/\/{2,}/g, "/").replace(":/", "://")
}
export function apiUrl(p: string) { return joinUrl(baseURL, p) }

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
    delete (config.headers as any)["Content-Type"]
    config.transformRequest = [(d) => d]
  } else {
    ;(config.headers as any)["Content-Type"] =
      (config.headers as any)["Content-Type"] || "application/json"
  }
  return config
})
api.interceptors.response.use((res) => res, (err) => Promise.reject(err))

/* -------------------- Helpers HTTP -------------------- */
export function postForm<T = any>(url: string, form: FormData) {
  return api.post<T>(url, form, { transformRequest: [(d) => d] })
}

/* -------------------- Utils de download -------------------- */
export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename || "download"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
function pickFilenameFromHeaders(hdrs: any, fallback: string) {
  const cd = hdrs?.["content-disposition"] || hdrs?.["Content-Disposition"]
  if (typeof cd === "string") {
    const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd)
    if (m?.[1]) return decodeURIComponent(m[1])
  }
  return fallback
}
function looksPublicUrl(u?: string | null) {
  if (!u) return false
  if (/^https?:\/\//i.test(u)) return true
  if (u.startsWith("/uploads/public/")) return true
  return false
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
export async function ensureMentorado(usuarioId: string) {
  try {
    const found = await getMentoradoByUsuarioId(usuarioId)
    if (found?.id) return found.id
  } catch {}
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

/* -------------------- Currículo -------------------- */
export async function uploadCurriculo(mentoradoId: string, file: File) {
  const form = new FormData()
  form.append("file", file)
  const { data } = await postForm(`/mentorados/${mentoradoId}/curriculo`, form)
  return data as {
    sucesso?: boolean
    storageKey?: string
    filename?: string
    mime?: string
    tamanho?: number
    url?: string | null
    [k: string]: any
  }
}

export async function downloadCurriculo(
  mentoradoId: string,
  filename?: string | null,
  rawUrl?: string | null
) {
  // 1) tenta exatamente a URL salva
  // 2) tenta rota autenticada /mentorados/:id/curriculo/:filename
  // 3) tenta rota direta da pasta privada (legado)
  const toAbs = (p: string) => (/^https?:\/\//i.test(p) ? p : apiUrl(p))
  const attempts: string[] = []

  if (rawUrl && rawUrl.trim()) attempts.push(toAbs(rawUrl.trim()))
  if (mentoradoId && filename) {
    attempts.push(apiUrl(`/mentorados/${mentoradoId}/curriculo/${encodeURIComponent(filename)}`))
    attempts.push(apiUrl(`/uploads/private/files/curriculum/${encodeURIComponent(filename)}`))
  }

  if (attempts.length === 0) throw new Error("Sem URL/filename do currículo.")

  let lastErr: any = null
  for (const url of attempts) {
    try {
      const { data, headers } = await api.get(url, { responseType: "blob" })
      const name = pickFilenameFromHeaders(headers, filename || "curriculo")
      triggerBrowserDownload(data, name)
      return
    } catch (e) { lastErr = e }
  }
  throw lastErr
}

/* -------------------- Áudio -------------------- */
export type MentoradoAudio = {
  filename: string
  mime: string
  size: number
  url: string
  savedAt: string
}

export async function uploadMentoradoAudio(mentoradoId: string, blob: Blob | File) {
  const form = new FormData()
  const name =
    (blob as File)?.name ||
    `audio-${Date.now()}.${(blob.type?.split("/")[1] || "webm").replace(/[^a-z0-9]/gi, "") || "webm"}`
  form.append("audio", blob, name)
  const { data } = await postForm<{ ok: boolean; audio: MentoradoAudio }>(
    `/mentorados/${mentoradoId}/audios`,
    form,
  )
  return data
}
export async function listMentoradoAudios(mentoradoId: string) {
  const { data } = await api.get<{ ok: boolean; total: number; audios: MentoradoAudio[] }>(
    `/mentorados/${mentoradoId}/audios`,
  )
  return data
}
export async function fetchAudioBlob(mentoradoId: string, audio: MentoradoAudio) {
  const url = apiUrl(`/mentorados/${mentoradoId}/audios/${encodeURIComponent(audio.filename)}`)
  const { data, headers } = await api.get(url, { responseType: "blob" })
  const name = pickFilenameFromHeaders(headers, audio.filename || "audio.webm")
  return { blob: data as Blob, filename: name }
}
export async function downloadMentoradoAudio(mentoradoId: string, audio: MentoradoAudio) {
  const { blob, filename } = await fetchAudioBlob(mentoradoId, audio)
  triggerBrowserDownload(blob, filename)
}
