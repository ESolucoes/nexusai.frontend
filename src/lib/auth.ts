const KEYS = {
  token: "access_token",
}

export function getToken(): string | null {
  const raw =
    localStorage.getItem(KEYS.token) ||
    sessionStorage.getItem(KEYS.token)
  if (!raw) return null
  return raw.replace(/^Bearer\s+/i, "").trim()
}

export function setToken(token: string, persist: "local" | "session" = "local") {
  const store = persist === "local" ? localStorage : sessionStorage
  store.setItem(KEYS.token, token.replace(/^Bearer\s+/i, "Bearer ").trim())
}

export function clearToken() {
  localStorage.removeItem(KEYS.token)
  sessionStorage.removeItem(KEYS.token)
}

export async function setTokenFromLoginResponse(res: Response, persist: "local" | "session" = "local") {
  const hdr =
    res.headers.get("authorization") ||
    res.headers.get("Authorization")
  if (hdr && /bearer/i.test(hdr)) {
    setToken(hdr, persist)
    return
  }

  try {
    const clone = res.clone()
    const data = await clone.json().catch(() => null as any)
    const bodyToken: string | undefined =
      data?.token || data?.access_token || data?.jwt
    if (bodyToken) {
      setToken(bodyToken, persist)
      return
    }
  } catch {  }
}

export function authHeader(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
