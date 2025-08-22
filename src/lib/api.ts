import axios from "axios"

const TOKEN_KEY = "access_token"

export function getToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    return raw.replace(/^Bearer\s+/i, "").trim()
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token && token.trim().length > 0) {
      const normalized = token.startsWith("Bearer ")
        ? token.trim()
        : `Bearer ${token.trim()}`
      localStorage.setItem(TOKEN_KEY, normalized)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export function decodeJwt<T = any>(token?: string | null): T | null {
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

function isExpired(token?: string | null) {
  const payload = decodeJwt<any>(token)
  const exp = payload?.exp
  if (!exp) return false
  return Math.floor(Date.now() / 1000) >= exp
}

const baseURL =
  import.meta.env.VITE_API_BASE?.replace(/\/+$/, "") ||
  "https://api.processosniper.com.br"

export const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token && !isExpired(token)) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  } else if (token && isExpired(token)) {
    clearToken()
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearToken()
    }
    return Promise.reject(err)
  }
)
