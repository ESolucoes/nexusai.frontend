// src/lib/api.ts
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
  return Math.floor(Date.now() / 1000) >= exp
}

/* -------------------- URL building -------------------- */
/**
 * VITE_API_URL:   ex: "https://api.processosniper.com.br"
 * VITE_API_BASE:  ex: "" (vazio)  OU "api"  OU "/api"
 * Regras:
 * - se BASE estiver vazia, não adiciona nada
 * - remove barras duplicadas
 */
const RAW_URL  = import.meta.env.VITE_API_URL ?? ""
const RAW_BASE = import.meta.env.VITE_API_BASE ?? ""

/** normaliza: tira barras extras */
const API_URL  = RAW_URL.trim().replace(/\/+$/, "")                        // sem barra no fim
const API_BASE = RAW_BASE.trim().replace(/^\/+|\/+$/g, "")                 // sem barras nas pontas

/** origem do front (fallback dev) */
const ORIGIN = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173"

/** base *final* do axios */
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
  // se sua API usa cookies/sessão, habilite:
  // withCredentials: true,
})

api.interceptors.request.use((config) => {
  const jwt = getToken()
  if (jwt && !isExpired(jwt)) {
    config.headers = config.headers ?? {}
    ;(config.headers as any).Authorization = `Bearer ${jwt}`
  }

  const isForm =
    typeof FormData !== "undefined" && config.data instanceof FormData

  config.headers = config.headers ?? {}
  if (isForm) {
    // deixa o browser setar boundary corretamente
    delete (config.headers as any)["Content-Type"]
    config.transformRequest = [(d) => d]
  } else {
    ;(config.headers as any)["Content-Type"] =
      (config.headers as any)["Content-Type"] || "application/json"
  }

  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
)

/* -------------------- Helpers -------------------- */
export function postForm<T = any>(url: string, form: FormData) {
  return api.post<T>(url, form, { transformRequest: [(d) => d] })
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
