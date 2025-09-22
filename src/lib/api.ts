// frontend/src/lib/api.ts
import axios from "axios"

/* ============================ JWT helpers ============================ */
const TOKEN_KEY = "access_token"

function normalizeJwt(raw?: string | null) {
  if (!raw) return null
  const cleaned = raw.replace(/^Bearer\s+/i, "").trim()
  return cleaned.length > 0 ? cleaned : null
}

export function setToken(token: string | null) {
  try {
    const c = normalizeJwt(token)
    if (c) localStorage.setItem(TOKEN_KEY, c)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export function getToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    const cleaned = normalizeJwt(raw)
    if (cleaned && raw !== cleaned) localStorage.setItem(TOKEN_KEY, cleaned)
    return cleaned
  } catch {
    return null
  }
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

function isExpired(jwt?: string | null) {
  const payload = decodeJwt<any>(jwt)
  const exp = payload?.exp
  if (!exp) return false
  return Math.floor(Date.now() / 1000) >= Number(exp)
}

/* ============================ URL helpers ============================ */
const RAW_URL = import.meta.env.VITE_API_URL ?? ""
const RAW_BASE = import.meta.env.VITE_API_BASE ?? ""
const API_URL = RAW_URL.trim().replace(/\/+$/, "")
const API_BASE = RAW_BASE.trim().replace(/^\/+|\/+$/g, "")
const ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:5173"

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
export function apiUrl(p: string) {
  return joinUrl(baseURL, p)
}

/** Retorna true se a URL já é absoluta (http/https/data/blob) */
function isAbsoluteUrl(u?: string | null) {
  return !!u && /^(?:https?:|data:|blob:)/i.test(u)
}

/** Normaliza URL de imagem/arquivo (se vier relativa do backend, prefixa com baseURL) */
export function resolveImageUrl(u?: string | null): string | null {
  if (!u) return null
  if (isAbsoluteUrl(u)) return u
  const trimmed = String(u).replace(/^\/+/, "")
  return `${baseURL}/${trimmed}`.replace(/\/{2,}/g, "/").replace(":/", "://")
}

/** Adiciona cache-busting ?t=timestamp sem quebrar query string existente */
export function cacheBust(u?: string | null, seed: number = Date.now()): string | null {
  if (!u) return null
  const sep = u.includes("?") ? "&" : "?"
  return `${u}${sep}t=${seed}`
}

/* ============================ Axios ============================ */
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
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err),
)

/* ============================ Helpers HTTP ============================ */
export function postForm<T = any>(url: string, form: FormData) {
  return api.post<T>(url, form, { transformRequest: [(d) => d] })
}

/* ============================ Download utils ============================ */
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
    const star = /filename\*=(?:UTF-8''|)([^;]+)/i.exec(cd)
    if (star?.[1]) return decodeURIComponent(star[1].replace(/^"+|"+$/g, ""))
    const plain = /filename="?([^";]+)"?/i.exec(cd)
    if (plain?.[1]) return decodeURIComponent(plain[1])
  }
  return fallback
}

/* ============================ Domain helpers: Usuários/Mentorado ============================ */
export type UsuarioResponse = {
  id: string
  nome: string
  email: string
  avatarUrl?: string | null
  mentorado?:
    | {
        id?: string
        tipo?: "Executive" | "First Class"
        curriculo?: { url?: string | null; filename?: string | null } | null
      }
    | null
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
  const { data } = await api.get<MentoradoResponse>(
    `/mentorados/por-usuario/${usuarioId}`,
  )
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

/* ============================ Avatar ============================ */
export async function uploadUsuarioAvatar(usuarioId: string, file: File) {
  const form = new FormData()
  form.append("file", file)
  const { data } = await postForm<{ sucesso: boolean; url: string }>(
    `/usuarios/${usuarioId}/avatar`,
    form,
  )
  ;(data as any).resolvedUrl = resolveImageUrl(data?.url || null)
  ;(data as any).bustedUrl = cacheBust((data as any).resolvedUrl || data?.url || null)
  return data
}

/* ============================ Currículo ============================ */
export async function uploadCurriculo(mentoradoId: string, file: File) {
  if (!mentoradoId) throw new Error("mentoradoId obrigatório")
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

export async function downloadCurriculo(mentoradoId: string) {
  if (!mentoradoId) throw new Error("mentoradoId obrigatório")
  const url = apiUrl(`/mentorados/${mentoradoId}/curriculo`)
  const { data, headers } = await api.get(url, { responseType: "blob" })
  const name = pickFilenameFromHeaders(headers, "curriculo.pdf")
  triggerBrowserDownload(data, name)
}

export type MentoradoCurriculo = {
  filename: string
  originalName: string
  mime: string
  size: number
  url: string
  savedAt: string
}

export async function uploadCurriculos(mentoradoId: string, files: File[]) {
  if (!mentoradoId) throw new Error("mentoradoId obrigatório")
  if (!files?.length) throw new Error("Nenhum arquivo selecionado")
  const form = new FormData()
  for (const f of files) form.append("files", f)
  const { data } = await postForm(`/mentorados/${mentoradoId}/curriculos`, form)
  return data as { sucesso: boolean; total: number; arquivos: MentoradoCurriculo[] }
}

export async function listMentoradoCurriculos(mentoradoId: string) {
  if (!mentoradoId) throw new Error("mentoradoId obrigatório")
  const { data } = await api.get<{ total: number; arquivos: MentoradoCurriculo[] }>(
    `/mentorados/${mentoradoId}/curriculo/list`,
  )
  return data
}

export async function downloadCurriculoByName(mentoradoId: string, filename: string) {
  if (!mentoradoId) throw new Error("mentoradoId obrigatório")
  if (!filename) throw new Error("filename obrigatório")
  const url = apiUrl(`/mentorados/${mentoradoId}/curriculo/by-name/${encodeURIComponent(filename)}`)
  const { data, headers } = await api.get(url, { responseType: "blob" })
  const name = ((): string => {
    const cd = headers?.["content-disposition"] || headers?.["Content-Disposition"]
    if (typeof cd === "string") {
      const star = /filename\*=(?:UTF-8''|)([^;]+)/i.exec(cd)
      if (star?.[1]) return decodeURIComponent(star[1].replace(/^"+|"+$/g, ""))
      const plain = /filename="?([^";]+)"?/i.exec(cd)
      if (plain?.[1]) return decodeURIComponent(plain[1])
    }
    return filename
  })()
  triggerBrowserDownload(data, name)
}

/* ============================ Áudio ============================ */
export type MentoradoAudio = {
  filename: string
  mime: string
  size: number
  url: string
  savedAt: string
}

export async function uploadMentoradoAudio(
  mentoradoId: string,
  blob: Blob | File,
) {
  if (!mentoradoId) throw new Error("mentoradoId obrigatório")
  const form = new FormData()

  // Garante nome/extensão compatível com o backend (mp3|wav), preferindo WAV.
  const lower = (blob.type || "").toLowerCase()
  let ext = ".wav"
  if (lower.includes("mpeg") || lower.includes("mp3")) ext = ".mp3"
  const safeName =
    (blob as File)?.name?.toLowerCase().match(/\.(mp3|wav)$/)
      ? (blob as File).name
      : `audio-${Date.now()}${ext}`

  form.append("audio", blob, safeName)
  const { data } = await postForm<{ ok: boolean; audio: MentoradoAudio }>(
    `/mentorados/${mentoradoId}/audios`,
    form,
  )
  return data
}

export async function listMentoradoAudios(mentoradoId: string) {
  const { data } = await api.get<{
    ok: boolean
    total: number
    audios: MentoradoAudio[]
  }>(`/mentorados/${mentoradoId}/audios`)
  return data
}

export async function fetchAudioBlob(
  mentoradoId: string,
  audio: MentoradoAudio,
) {
  const url = apiUrl(
    `/mentorados/${mentoradoId}/audios/${encodeURIComponent(audio.filename)}`,
  )
  const { data, headers } = await api.get(url, { responseType: "blob" })
  const name = pickFilenameFromHeaders(headers, audio.filename || "audio.wav")
  return { blob: data as Blob, filename: name }
}

export async function downloadMentoradoAudio(
  mentoradoId: string,
  audio: MentoradoAudio,
) {
  const { blob, filename } = await fetchAudioBlob(mentoradoId, audio)
  triggerBrowserDownload(blob, filename)
}

/* ============================ Vagas (Links) ============================ */
export type VagaLink = {
  id: string
  titulo: string
  url: string
  fonte?: string | null
  descricao?: string | null
  criadoEm: string
  atualizadoEm: string
  ativo: boolean
}

export async function listMyVagaLinks(pagina = 1, quantidade = 10) {
  const { data } = await api.get<{
    itens: VagaLink[]
    total: number
    pagina: number
    quantidade: number
  }>(`/vagas-links`, { params: { pagina, quantidade } })
  return data
}

export type CreateVagaLinkPayload = {
  url: string
  titulo?: string
  fonte?: string
  descricao?: string
  ativo?: boolean
}

export async function createMyVagaLink(payload: CreateVagaLinkPayload) {
  const { data } = await api.post<VagaLink>(`/vagas-links`, payload)
  return data
}

/* ============================ SSI ============================ */
export type SsiMetrica =
  | "SSI_SETOR"
  | "SSI_REDE"
  | "SSI_TOTAL"
  | "PILAR_MARCA"
  | "PILAR_PESSOAS_CERTAS"
  | "PILAR_INSIGHTS"
  | "PILAR_RELACIONAMENTOS"
  | "IMPRESSOES_PUBLICACAO"
  | "VISUALIZACOES_PERFIL"
  | "OCORRENCIAS_PESQUISA"
  | "TAXA_RECRUTADORES"
  | "CANDIDATURAS_SIMPLIFICADAS"
  | "CANDIDATURAS_VISUALIZADAS"
  | "CURRICULOS_BAIXADOS"
  | "CONTATOS_RH"
  | "PUBLICACOES_SEMANA"
  | "INTERACOES_COMENTARIOS"
  | "CONTRIBUICOES_ARTIGOS"
  | "PEDIDOS_CONEXAO_HEADHUNTERS"
  | "PEDIDOS_CONEXAO_DECISORES"
  | "MENSAGENS_RECRUTADORES"
  | "MENSAGENS_NETWORKING"
  | "CAFES_AGENDADOS"
  | "CAFES_TOMADOS"
  | "ENTREVISTAS_REALIZADAS"
  | "ENTREVISTAS_FASE_FINAL"
  | "CARTAS_OFERTA"

export type SsiUnidade = "NUMERO" | "PERCENTUAL"
export type SsiStatus = "OTIMO" | "BOM" | "RUIM"

export type SsiResultado = {
  id: string
  usuarioId: string | null
  metrica: SsiMetrica
  dataReferencia: string
  valor: string
  unidade: SsiUnidade
  status: SsiStatus
  metaAplicada: string
  criadoEm: string
  atualizadoEm: string
}

export type SsiMeta = {
  id: string
  metrica: SsiMetrica
  valorMeta: string
  unidade: SsiUnidade
  criadoEm: string
  atualizadoEm: string
}

export async function listSsi(params: {
  usuarioId?: string
  metrica?: SsiMetrica
  dataInicio?: string
  dataFim?: string
  pagina?: number
  quantidade?: number
}) {
  const { data } = await api.get<{
    total: number
    pagina: number
    quantidade: number
    items: SsiResultado[]
  }>("/ssi", { params })
  return data
}

export async function upsertSsi(dto: {
  usuarioId?: string
  metrica: SsiMetrica
  dataReferencia: string
  valor: number
}) {
  const { data } = await api.put<{ sucesso: true }>("/ssi", dto)
  return data
}

export async function postSsiBatch(dto: {
  usuarioId?: string
  dataReferencia: string
  itens: { metrica: SsiMetrica; valor: number }[]
}) {
  const { data } = await api.post<{ sucesso: true }>("/ssi/batch", dto)
  return data
}

export async function upsertSsiBatch(dto: {
  usuarioId?: string
  dataReferencia: string
  itens: { metrica: SsiMetrica; valor: number }[]
}) {
  const { data } = await api.put<{ sucesso: true }>("/ssi/batch", dto)
  return data
}

export async function listSsiMetas() {
  const { data } = await api.get<SsiMeta[]>("/ssi/metas")
  return data
}

export async function upsertSsiMeta(
  dto: { metrica: SsiMetrica; valorMeta: number; unidade: SsiUnidade },
  recalc?: boolean,
) {
  const { data } = await api.put<{ sucesso: true }>("/ssi/metas", dto, {
    params: { recalcular: recalc ? "true" : "false" },
  })
  return data
}

export async function upsertSsiMetasBatch(
  itens: { metrica: SsiMetrica; valorMeta: number; unidade: SsiUnidade }[],
  recalc?: boolean,
) {
  const body = { itens }
  const { data } = await api.put<{ sucesso: true }>("/ssi/metas/batch", body, {
    params: { recalcular: recalc ? "true" : "false" },
  })
  return data
}

/* ============================ SSI: Semanas & Consulta por semana ============================ */
export type SsiWeekRef = { dataReferencia: string; totalMetricas: number }

export type SsiSemanaPayload = {
  semana: string
  itens: Array<{
    id: string
    usuarioId: string | null
    metrica: SsiMetrica
    dataReferencia: string
    valor: string
    unidade: SsiUnidade
    status: "OTIMO" | "BOM" | "RUIM"
    metaAplicada: string
    criadoEm: string
    atualizadoEm: string
  }>
}

export async function listSsiWeeks() {
  const { data } = await api.get<SsiWeekRef[]>("/ssi/semanas")
  return data
}

export async function getSsiByWeek(date: string) {
  const { data } = await api.get<SsiSemanaPayload>("/ssi/por-semana", {
    params: { data: date },
  })
  return data
}

/* ============================ SSI: Dashboard por semanas ============================ */
export type SsiDashboardTabela = {
  semanas: string[]; // ex.: ['2025-09-01','2025-09-08',...]
  itens: Array<{
    metrica: SsiMetrica;
    unidade: SsiUnidade;
    valores: Record<string, number>; // chave = semana (data), valor = número
  }>;
};

export async function getSsiDashboardTabela(params?: { dataInicio?: string; dataFim?: string }) {
  const { data } = await api.get<SsiDashboardTabela>('/ssi/dashboard-tabela', { params });
  return data;
}

/* ============================ Usuário: Update / Delete ============================ */
export type PutUsuarioDto = {
  nome?: string
  email?: string
  telefone?: string
  novaSenha?: string
}

export async function updateUsuario(id: string, dto: PutUsuarioDto) {
  const { data } = await api.put(`/usuarios/${id}`, dto)
  return data
}

export async function deleteUsuario(id: string) {
  const { data } = await api.delete<{ id: string; sucesso: boolean }>(`/usuarios/${id}`)
  return data
}

/* ============================ Vigências ============================ */
export type VigenciaDto = {
  id: string
  usuarioId: string
  inicio: string
  fim: string | null
}

export async function listVigenciasPorUsuario(usuarioId: string) {
  const { data } = await api.get<VigenciaDto[]>(`/vigencias/${usuarioId}`)
  return data
}

export async function updateVigencia(id: string, dto: { inicio?: string; fim?: string | null }) {
  const { data } = await api.put(`/vigencias/${id}`, dto)
  return data
}

export async function toggleVigencia(usuarioId: string, ativo: boolean) {
  const { data } = await api.patch<{ status: "ativada" | "desativada" }>(
    `/vigencias/${usuarioId}/switch`,
    { ativo }
  )
  return data
}

/* ============================ Mentorado: Update ============================ */
export type PutMentoradoDto = {
  mentorId?: string | null
  tipo?: "Executive" | "First Class"
  rg?: string
  cpf?: string
  nomePai?: string
  nomeMae?: string
  dataNascimento?: string
  rua?: string
  numero?: string
  complemento?: string
  cep?: string
  cargoObjetivo?: string
  pretensaoClt?: number
  pretensaoPj?: number
  linkedin?: string
}

export async function updateMentorado(id: string, dto: PutMentoradoDto) {
  const { data } = await api.put(`/mentorados/${id}`, dto)
  return data
}

/* ============================ Helpers JWT (já usados nas páginas) ============================ */
export function pickUserIdFromJwt(jwt?: string | null): string | null {
  const p = decodeJwt<any>(jwt)
  const candidates = [p?.sub, p?.id, p?.userId, p?.uid, p?.usuarioId, p?.user_id]
  const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0)
  return found ? String(found) : null
}
