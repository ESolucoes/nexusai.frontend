// frontend/src/lib/api.ts
import axios from "axios";

/* ============================ JWT helpers ============================ */
const TOKEN_KEY = "access_token";

function normalizeJwt(raw?: string | null) {
  if (!raw) return null;
  const cleaned = raw.replace(/^Bearer\s+/i, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function setToken(token: string | null) {
  try {
    const c = normalizeJwt(token);
    if (c) localStorage.setItem(TOKEN_KEY, c);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function getToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    const cleaned = normalizeJwt(raw);
    if (cleaned && raw !== cleaned) localStorage.setItem(TOKEN_KEY, cleaned);
    return cleaned;
  } catch {
    return null;
  }
}

export function decodeJwt<T = any>(token?: string | null): T | null {
  if (!token) return null;
  try {
    const base = token.split(".")[1];
    const padded = base.padEnd(
      base.length + ((4 - (base.length % 4)) % 4),
      "="
    );
    const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isExpired(jwt?: string | null) {
  const payload = decodeJwt<any>(jwt);
  const exp = payload?.exp;
  if (!exp) return false;
  return Math.floor(Date.now() / 1000) >= Number(exp);
}

/* ============================ URL helpers ============================ */
const RAW_URL = import.meta.env.VITE_API_URL ?? "";
const RAW_BASE = import.meta.env.VITE_API_BASE ?? "";
const API_URL = RAW_URL.trim().replace(/\/+$/, "");
const API_BASE = RAW_BASE.trim().replace(/^\/+|\/+$/g, "");
const ORIGIN =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:5173";

export const baseURL = (() => {
  // 🔥 CORREÇÃO CRÍTICA: Em produção, usar URL absoluta do backend
  if (import.meta.env.PROD) {
    return API_URL || "https://api.processosniper.com.br";
  }

  // Em desenvolvimento, manter lógica anterior
  const root = API_URL || ORIGIN.replace(/\/+$/, "");
  const base = API_BASE ? `/${API_BASE}` : "";
  return `${root}${base}`.replace(/\/{2,}/g, "/").replace(":/", "://");
})();

function joinUrl(root: string, path: string) {
  const r = root.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${r}/${p}`.replace(/\/{2,}/g, "/").replace(":/", "://");
}
export function apiUrl(p: string) {
  return joinUrl(baseURL, p);
}

/** Retorna true se a URL já é absoluta (http/https/data/blob) */
function isAbsoluteUrl(u?: string | null) {
  return !!u && /^(?:https?:|data:|blob:)/i.test(u);
}

/** Normaliza URL de imagem/arquivo (se vier relativa do backend, prefixa com baseURL) */
export function resolveImageUrl(u?: string | null): string | null {
  if (!u) return null;
  if (isAbsoluteUrl(u)) return u;

  const trimmed = String(u).replace(/^\/+/, "");

  // 🔥 CORREÇÃO CRÍTICA: Garantir que URLs relativas sejam resolvidas corretamente
  // Se começar com 'uploads/', usar baseURL do backend
  if (trimmed.startsWith("uploads/")) {
    return `${baseURL}/${trimmed}`.replace(/\/{2,}/g, "/").replace(":/", "://");
  }

  // Se for um caminho absoluto relativo (começa com /)
  if (u.startsWith("/")) {
    return `${baseURL}${u}`;
  }

  // Para outros caminhos relativos
  return `${baseURL}/${trimmed}`.replace(/\/{2,}/g, "/").replace(":/", "://");
}

/** Adiciona cache-busting ?t=timestamp sem quebrar query string existente */
export function cacheBust(
  u?: string | null,
  seed: number = Date.now()
): string | null {
  if (!u) return null;
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}t=${seed}`;
}

/* ============================ Axios ============================ */
export const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const jwt = getToken();
  if (jwt && !isExpired(jwt)) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${jwt}`;
  }
  const isForm =
    typeof FormData !== "undefined" && config.data instanceof FormData;
  config.headers = config.headers ?? {};
  if (isForm) {
    delete (config.headers as any)["Content-Type"];
    config.transformRequest = [(d) => d];
  } else {
    (config.headers as any)["Content-Type"] =
      (config.headers as any)["Content-Type"] || "application/json";
  }
  return config;
});
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

/* ============================ Helpers HTTP ============================ */
export function postForm<T = any>(url: string, form: FormData) {
  return api.post<T>(url, form, { transformRequest: [(d) => d] });
}

/* ============================ Download utils ============================ */
export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function pickFilenameFromHeaders(hdrs: any, fallback: string) {
  const cd = hdrs?.["content-disposition"] || hdrs?.["Content-Disposition"];
  if (typeof cd === "string") {
    const star = /filename\*=(?:UTF-8''|)([^;]+)/i.exec(cd);
    if (star?.[1]) return decodeURIComponent(star[1].replace(/^"+|"+$/g, ""));
    const plain = /filename="?([^";]+)"?/i.exec(cd);
    if (plain?.[1]) return decodeURIComponent(plain[1]);
  }
  return fallback;
}

/* ============================ Domain helpers: Usuários/Mentorado ============================ */
export type UsuarioResponse = {
  id: string;
  nome: string;
  email: string;
  avatarUrl?: string | null;
  mentorado?: {
    id?: string;
    tipo?: "Executive" | "First Class";
    curriculo?: { url?: string | null; filename?: string | null } | null;
  } | null;
  mentor?: {
    id?: string;
    tipo?: "admin" | "normal";
  } | null;
};

export type MentoradoResponse = {
  id: string;
  usuarioId: string;
  mentorId?: string | null;
  tipo: "Executive" | "First Class";
  curriculo?: { url?: string | null; filename?: string | null } | null;
};

export async function getUsuarioById(id: string) {
  const { data } = await api.get<UsuarioResponse>(`/usuarios/${id}`);

  // 🔥 CORREÇÃO: Buscar informações do avatar separadamente
  try {
    const avatarResponse = await api.get(`/usuarios/${id}/avatar`);
    if (avatarResponse.data?.avatarUrl) {
      data.avatarUrl = resolveImageUrl(avatarResponse.data.avatarUrl);
    }
  } catch (error) {
    // Se não tiver avatar, mantém o avatarUrl original ou null
    console.log("Usuário sem avatar");
  }

  return data;
}

export async function getMentoradoByUsuarioId(usuarioId: string) {
  const { data } = await api.get<MentoradoResponse>(
    `/mentorados/por-usuario/${usuarioId}`
  );

  // 🔥 CORREÇÃO: Resolver URL do currículo
  if (data.curriculo?.url) {
    data.curriculo.url = resolveImageUrl(data.curriculo.url);
  }

  return data;
}

export async function createMentoradoMinimal(payload: {
  usuarioId: string;
  mentorId?: string | null;
  tipo?: "Executive" | "First Class";
}) {
  const body = {
    usuarioId: payload.usuarioId,
    mentorId: payload.mentorId ?? null,
    tipo: payload.tipo ?? "Executive",
  };
  const { data } = await api.post<MentoradoResponse>(`/mentorados`, body);
  return data;
}

export async function ensureMentorado(usuarioId: string) {
  try {
    const found = await getMentoradoByUsuarioId(usuarioId);
    if (found?.id) return found.id;
  } catch {}
  try {
    const created = await createMentoradoMinimal({ usuarioId });
    return created?.id;
  } catch (err: any) {
    const msg: string = err?.response?.data?.message ?? "";
    const already = /existe|já existe|duplicado|unique/i.test(msg);
    if (already) {
      const found = await getMentoradoByUsuarioId(usuarioId);
      return found?.id;
    }
    throw err;
  }
}

/* ============================ Avatar ============================ */
export async function uploadUsuarioAvatar(usuarioId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await postForm<{ sucesso: boolean; url: string }>(
    `/usuarios/${usuarioId}/avatar`,
    form
  );

  // 🔥 CORREÇÃO: Garantir que a URL seja resolvida corretamente em produção
  const resolvedUrl = resolveImageUrl(data?.url || null);

  return {
    ...data,
    resolvedUrl,
    bustedUrl: cacheBust(resolvedUrl),
  };
}

/* ============================ Currículo ============================ */
export type MentoradoCurriculo = {
  filename: string;
  originalName: string;
  mime: string;
  size: number;
  url: string;
  savedAt: string;
};

// Tipo de retorno simplificado para as funções de upload de arquivo único
export type CurriculoUploadResult = {
  sucesso: boolean;
  storageKey: string;
  filename: string;
  mime: string;
  tamanho: number;
  url?: string | null;
};

/**
 * Envia um único arquivo de currículo. Usa a rota de múltiplos no backend
 * para garantir consistência, mas retorna apenas a informação do primeiro arquivo.
 */
export async function uploadCurriculo(
  mentoradoId: string,
  file: File
): Promise<CurriculoUploadResult> {
  if (!mentoradoId) throw new Error("mentoradoId obrigatório");

  const form = new FormData();
  form.append("files", file);

  const { data } = await postForm(
    `/mentorados/${mentoradoId}/curriculos`,
    form
  );

  const info = (data as { arquivos: MentoradoCurriculo[] })?.arquivos?.[0];

  if (!info)
    throw new Error(
      "Upload concluído, mas informações do arquivo ausentes na resposta da API."
    );

  // 🔥 CORREÇÃO: Resolver URL para produção
  const resolvedUrl = resolveImageUrl(info.url ?? null);

  return {
    sucesso: true,
    storageKey: info.filename ?? "",
    filename: info.originalName ?? "",
    mime: info.mime ?? "",
    tamanho: info.size ?? 0,
    url: resolvedUrl,
  };
}

/**
 * Envia múltiplos arquivos de currículo.
 */
export async function uploadCurriculos(mentoradoId: string, files: File[]) {
  if (!mentoradoId) throw new Error("mentoradoId obrigatório");
  if (!files?.length) throw new Error("Nenhum arquivo selecionado");

  const form = new FormData();
  for (const f of files) form.append("files", f);

  const { data } = await postForm(
    `/mentorados/${mentoradoId}/curriculos`,
    form
  );

  const response = data as {
    sucesso: boolean;
    total: number;
    arquivos: MentoradoCurriculo[];
  };

  // 🔥 CORREÇÃO: Resolver URLs para produção
  response.arquivos = response.arquivos.map((arquivo) => ({
    ...arquivo,
    url: resolveImageUrl(arquivo.url) || arquivo.url,
  }));

  return response;
}

/**
 * 🎯 FUNÇÃO CHAVE PARA O FRONTEND: Busca as informações do último currículo salvo (GET /latest-info).
 * 🛑 CORRIGIDO: Agora resolve a URL relativa para absoluta.
 */
export async function getLatestCurriculoInfo(
  mentoradoId: string
): Promise<MentoradoCurriculo | null> {
  if (!mentoradoId) return null;
  try {
    const { data } = await api.get<MentoradoCurriculo>(
      `/mentorados/${mentoradoId}/curriculo/latest-info`
    );

    // 🔥 CORREÇÃO APLICADA AQUI!
    if (data && data.url) {
      data.url = resolveImageUrl(data.url) || data.url;
    }

    return data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Baixa o currículo mais recente (sem passar o nome do arquivo).
 */
export async function downloadCurriculo(mentoradoId: string) {
  if (!mentoradoId) throw new Error("mentoradoId obrigatório");
  const url = apiUrl(`/mentorados/${mentoradoId}/curriculo`);
  const { data, headers } = await api.get(url, { responseType: "blob" });
  const name = pickFilenameFromHeaders(headers, "curriculo.pdf");
  triggerBrowserDownload(data, name);
}

/**
 * Lista todos os currículos (se o backend salvar histórico).
 */
export async function listMentoradoCurriculos(mentoradoId: string) {
  if (!mentoradoId) throw new Error("mentoradoId obrigatório");
  const { data } = await api.get<{
    total: number;
    arquivos: MentoradoCurriculo[];
  }>(`/mentorados/${mentoradoId}/curriculo/list`);

  // 🔥 CORREÇÃO: Resolver URLs para produção
  data.arquivos = data.arquivos.map((arquivo) => ({
    ...arquivo,
    url: resolveImageUrl(arquivo.url) || arquivo.url,
  }));

  return data;
}

/**
 * Baixa um currículo específico pelo seu nome de arquivo.
 */
export async function downloadCurriculoByName(
  mentoradoId: string,
  filename: string
) {
  if (!mentoradoId) throw new Error("mentoradoId obrigatório");
  if (!filename) throw new Error("filename obrigatório");
  const url = apiUrl(
    `/mentorados/${mentoradoId}/curriculo/by-name/${encodeURIComponent(
      filename
    )}`
  );
  const { data, headers } = await api.get(url, { responseType: "blob" });

  const name = ((): string => {
    const cd =
      headers?.["content-disposition"] || headers?.["Content-Disposition"];
    if (typeof cd === "string") {
      const star = /filename\*=(?:UTF-8''|)([^;]+)/i.exec(cd);
      if (star?.[1]) return decodeURIComponent(star[1].replace(/^"+|"+$/g, ""));
      const plain = /filename="?([^";]+)"?/i.exec(cd);
      if (plain?.[1]) return decodeURIComponent(plain[1]);
    }
    return filename;
  })();

  triggerBrowserDownload(data, name);
}

/* ============================ Áudio ============================ */
export type MentoradoAudio = {
  filename: string;
  mime: string;
  size: number;
  url: string;
  savedAt: string;
};

export async function uploadMentoradoAudio(
  mentoradoId: string,
  blob: Blob | File
) {
  if (!mentoradoId) throw new Error("mentoradoId obrigatório");
  const form = new FormData();

  const lower = (blob.type || "").toLowerCase();
  let ext = ".wav";
  if (lower.includes("mpeg") || lower.includes("mp3")) ext = ".mp3";
  const safeName = (blob as File)?.name?.toLowerCase().match(/\.(mp3|wav)$/)
    ? (blob as File).name
    : `audio-${Date.now()}${ext}`;

  form.append("audio", blob, safeName);
  const { data } = await postForm<{ ok: boolean; audio: MentoradoAudio }>(
    `/mentorados/${mentoradoId}/audios`,
    form
  );

  // 🔥 CORREÇÃO: Resolver URL para produção
  if (data.audio && data.audio.url) {
    data.audio.url = resolveImageUrl(data.audio.url) || data.audio.url;
  }

  return data;
}

export async function listMentoradoAudios(mentoradoId: string) {
  const { data } = await api.get<{
    ok: boolean;
    total: number;
    audios: MentoradoAudio[];
  }>(`/mentorados/${mentoradoId}/audios`);

  // 🔥 CORREÇÃO: Resolver URLs para produção
  data.audios = data.audios.map((audio) => ({
    ...audio,
    url: resolveImageUrl(audio.url) || audio.url,
  }));

  return data;
}

export async function fetchAudioBlob(
  mentoradoId: string,
  audio: MentoradoAudio
) {
  const url = apiUrl(
    `/mentorados/${mentoradoId}/audios/${encodeURIComponent(audio.filename)}`
  );
  const { data, headers } = await api.get(url, { responseType: "blob" });
  const name = pickFilenameFromHeaders(headers, audio.filename || "audio.wav");
  return { blob: data as Blob, filename: name };
}

export async function downloadMentoradoAudio(
  mentoradoId: string,
  audio: MentoradoAudio
) {
  const { blob, filename } = await fetchAudioBlob(mentoradoId, audio);
  triggerBrowserDownload(blob, filename);
}

/* ============================ Vagas (Links) ============================ */
export type VagaLink = {
  id: string;
  titulo: string;
  url: string;
  fonte?: string | null;
  descricao?: string | null;
  criadoEm: string;
  atualizadoEm: string;
  ativo: boolean;
};

export async function listMyVagaLinks(pagina = 1, quantidade = 10) {
  const { data } = await api.get<{
    itens: VagaLink[];
    total: number;
    pagina: number;
    quantidade: number;
  }>(`/vagas-links`, { params: { pagina, quantidade } });
  return data;
}

export type CreateVagaLinkPayload = {
  url: string;
  titulo?: string;
  fonte?: string;
  descricao?: string;
  ativo?: boolean;
};

export async function createMyVagaLink(payload: CreateVagaLinkPayload) {
  const { data } = await api.post<VagaLink>(`/vagas-links`, payload);
  return data;
}

export async function removeMyVagaLink(id: string) {
  const { data } = await api.delete<{ ok: boolean }>(`/vagas-links/${id}`);
  return data;
}

/* ====================================================================== */
/* ==================== MENTORADO CRONOGRAMA (NOVO) ===================== */
/* ====================================================================== */

export type CronogramaSemanaItem = {
  id: string;
  semana: string;
  meta: string;
  tarefa: string;
  ordem: number;
  concluido: boolean;
};

export type CronogramaSemanasGrouped = Record<
  string,
  {
    meta: string;
    tarefas: Array<
      Pick<CronogramaSemanaItem, "id" | "tarefa" | "ordem" | "concluido">
    >;
  }
>;

export type CronogramaRotinaItem = {
  id: string;
  usuarioId?: string | null;
  grupo: string;
  dia: string;
  titulo: string;
  ordem: number;
  ativo: boolean;
};

export async function seedCronograma(usuarioId?: string) {
  const { data } = await api.post<{ ok: boolean; seeded: boolean }>(
    `/mentorado-cronograma/seed`,
    usuarioId ? { usuarioId } : {}
  );
  return data;
}

export async function listCronogramaSemanas(usuarioId?: string) {
  const { data } = await api.get<CronogramaSemanasGrouped>(
    `/mentorado-cronograma/semanas`,
    {
      params: usuarioId ? { usuarioId } : undefined,
    }
  );
  return data;
}

export async function updateCronogramaSemana(
  id: string,
  dto: Partial<Pick<CronogramaSemanaItem, "concluido" | "tarefa" | "ordem">>
) {
  const { data } = await api.patch<CronogramaSemanaItem>(
    `/mentorado-cronograma/semanas/${id}`,
    dto
  );
  return data;
}

export async function listCronogramaRotina(usuarioId?: string) {
  const { data } = await api.get<CronogramaRotinaItem[]>(
    `/mentorado-cronograma/rotina`,
    { params: usuarioId ? { usuarioId } : undefined }
  );
  return data;
}

export async function upsertCronogramaRotina(
  itens: Array<
    Pick<CronogramaRotinaItem, "dia" | "titulo" | "ordem" | "ativo">
  >,
  usuarioId?: string
) {
  const { data } = await api.put<{ ok: boolean }>(
    `/mentorado-cronograma/rotina`,
    { itens, usuarioId: usuarioId ?? null }
  );
  return data;
}

/* ====================================================================== */
/* ======================= MENTORADO-SSI (NOVO) ========================= */
/* ====================================================================== */

export type MssIndicador =
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
  | "CARGOS_ENCONTRARAM_PERFIL"
  | "TAXA_RECRUTADORES"
  | "CANDIDATURAS_SIMPLIFICADAS"
  | "CANDIDATURAS_VISUALIZADAS"
  | "CURRICULOS_BAIXADOS"
  | "CONTATOS_RH"
  | "PUBLICACOES_SEMANA"
  | "INTERACOES_COMENTARIOS"
  | "PEDIDOS_CONEXAO_HEADHUNTERS"
  | "PEDIDOS_CONEXAO_DECISORES"
  | "MENSAGENS_RECRUTADORES"
  | "MENSAGENS_NETWORKING"
  | "CAFES_AGENDADOS"
  | "CAFES_TOMADOS"
  | "ENTREVISTAS_REALIZADAS"
  | "ENTREVISTAS_FASE_FINAL"
  | "CARTAS_OFERTA";

export type MssStatus = "OTIMO" | "BOM" | "RUIM";

export type MssDefinicao = {
  indicador: MssIndicador;
  nome: string;
  meta: string;
  textos: {
    positivo: string[];
    negativo: string[];
    planoDeAcao: string[];
  };
};

export type MssTabelaVaziaItem = {
  indicador: MssIndicador;
  nome: string;
  meta: string;
  semanas: (number | null)[];
  textos: {
    positivo: string[];
    negativo: string[];
    planoDeAcao: string[];
  };
};

export type MssClassificarInItem = {
  indicador: MssIndicador;
  semanas: number[];
};

export type MssClassificarOutItem = {
  indicador: MssIndicador;
  nome: string;
  meta: string;
  semanas: number[];
  statusSemanal: MssStatus[];
  textos: {
    positivo: string[];
    negativo: string[];
    planoDeAcao: string[];
  };
};

export async function getMssDefinicoes() {
  const { data } = await api.get<MssDefinicao[]>(`/mentorado-ssi/definicoes`);
  return data;
}

export async function getMssTabelaVazia() {
  const { data } = await api.get<MssTabelaVaziaItem[]>(`/mentorado-ssi/tabela`);
  return data;
}

export async function postMssClassificar(itens: MssClassificarInItem[]) {
  const { data } = await api.post<MssClassificarOutItem[]>(
    `/mentorado-ssi/classificar`,
    { itens }
  );
  return data;
}

/* ============================ Usuário: Update / Delete ============================ */
export type PutUsuarioDto = {
  nome?: string;
  email?: string;
  telefone?: string;
  novaSenha?: string;
};

export async function updateUsuario(id: string, dto: PutUsuarioDto) {
  const { data } = await api.put(`/usuarios/${id}`, dto);
  return data;
}

export async function deleteUsuario(id: string) {
  const { data } = await api.delete<{ id: string; sucesso: boolean }>(
    `/usuarios/${id}`
  );
  return data;
}

/* ============================ Vigências ============================ */
export type VigenciaDto = {
  id: string;
  usuarioId: string;
  inicio: string;
  fim: string | null;
};

export async function listVigenciasPorUsuario(usuarioId: string) {
  const { data } = await api.get<VigenciaDto[]>(`/vigencias/${usuarioId}`);
  return data;
}

export async function updateVigencia(
  id: string,
  dto: { inicio?: string; fim?: string | null }
) {
  const { data } = await api.put(`/vigencias/${id}`, dto);
  return data;
}

export async function toggleVigencia(usuarioId: string, ativo: boolean) {
  const { data } = await api.patch<{ status: "ativada" | "desativada" }>(
    `/vigencias/${usuarioId}/switch`,
    { ativo }
  );
  return data;
}

/* ============================ Mentorado: Update ============================ */
export type PutMentoradoDto = {
  mentorId?: string | null;
  tipo?: "Executive" | "First Class";
  rg?: string;
  cpf?: string;
  nomePai?: string;
  nomeMae?: string;
  dataNascimento?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  cep?: string;
  cargoObjetivo?: string;
  pretensaoClt?: number;
  pretensaoPj?: number;
  linkedin?: string;
};

export async function updateMentorado(id: string, dto: PutMentoradoDto) {
  const { data } = await api.put(`/mentorados/${id}`, dto);
  return data;
}

/* ============================ Candidaturas Automatizadas ============================ */

export type RespostasChatConfig = {
  disponibilidade?: string;
  avisoPrevio?: string;
  interesse?: string;
  pretensaoSalarial?: string;
  pretensaoPj?: string;
  localizacao?: string;
  experiencia?: string;
  outrasPerguntas?: string;
  respostaPadrao?: string;
};

export type IniciarAutomacaoPayload = {
  email: string;
  password: string;
  tipoVaga: string;
  empresasBloqueadas?: string[];
  maxAplicacoes?: number;
  mentoradoId?: string;
  respostasChat?: RespostasChatConfig;
};

export type AutomacaoResponse = {
  success: boolean;
  results: Array<{
    success: boolean;
    jobTitle?: string;
    company?: string;
    applied: boolean;
    error?: string;
    timestamp: string;
    chatResponses?: string[];
  }>;
  message: string;
};

export async function getMeuMentorado() {
  const { data } = await api.get<{
    id: string;
    cargoObjetivo: string;
    pretensaoClt: number;
    pretensaoPj: number;
    linkedin: string;
  }>("/mentorados-candidatura/meu-mentorado");
  return data;
}

export async function iniciarAutomacaoLinkedIn(
  payload: IniciarAutomacaoPayload
): Promise<AutomacaoResponse> {
  const { data } = await api.post<AutomacaoResponse>(
    "/mentorados-candidatura/iniciar-automacao",
    payload,
    { timeout: 300000 }
  );
  return data;
}

/* ============================ Mentor: Update Tipo ============================ */
export type PutMentorTipoDto = {
  tipo: "admin" | "normal";
};

export async function updateMentorTipo(
  mentorId: string,
  dto: PutMentorTipoDto
) {
  const { data } = await api.put(`/mentores/${mentorId}`, dto);
  return data;
}

export async function getMentorById(mentorId: string) {
  const { data } = await api.get(`/mentores/${mentorId}`);
  return data;
}

export function pickUserIdFromJwt(jwt?: string | null): string | null {
  const p = decodeJwt<any>(jwt);
  const candidates = [
    p?.sub,
    p?.id,
    p?.userId,
    p?.uid,
    p?.usuarioId,
    p?.user_id,
  ];
  const found = candidates.find(
    (v) => typeof v === "string" && v.trim().length > 0
  );
  return found ? String(found) : null;
}

export async function getMentoradoById(mentoradoId: string) {
  const { data } = await api.get(`/mentorados/${mentoradoId}`);
  return data;
}

export async function createMentorado(dto: any) {
  const { data } = await api.post(`/mentorados`, dto);
  return data;
}

export async function listMentorados() {
  const { data } = await api.get(`/mentorados`);
  return data;
}

export async function deleteMentorado(id: string) {
  const { data } = await api.delete(`/mentorados/${id}`);
  return data;
}

export async function uploadAvatar(usuarioId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(`/usuarios/${usuarioId}/avatar`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  // 🔥 CORREÇÃO: Resolver URL
  if (data.url) {
    data.url = resolveImageUrl(data.url);
  }

  return data;
}

export async function getUsuarioCompleto(id: string) {
  const { data } = await api.get(`/usuarios/${id}`);

  // 🔥 CORREÇÃO: Resolver URL do avatar
  if (data.avatarUrl) {
    data.avatarUrl = resolveImageUrl(data.avatarUrl);
  }

  return data;
}

export async function listMentoresPaginados(
  page: number = 1,
  limit: number = 20,
  filters?: any
) {
  const { data } = await api.get(`/usuarios/mentores`, {
    params: { page, limit, ...filters },
  });

  // 🔥 CORREÇÃO: Resolver URLs dos avatares
  if (data.itens) {
    data.itens = data.itens.map((item: any) => ({
      ...item,
      avatarUrl: resolveImageUrl(item.avatarUrl),
    }));
  }

  return data;
}

export async function listMentoradosPaginados(
  page: number = 1,
  limit: number = 20,
  filters?: any
) {
  const { data } = await api.get(`/usuarios/mentorados`, {
    params: { page, limit, ...filters },
  });

  // 🔥 CORREÇÃO: Resolver URLs dos avatares
  if (data.itens) {
    data.itens = data.itens.map((item: any) => ({
      ...item,
      avatarUrl: resolveImageUrl(item.avatarUrl),
    }));
  }

  return data;
}

export async function countMentores() {
  const { data } = await api.get(`/usuarios/mentores/count`);
  return data;
}

export async function countMentorados() {
  const { data } = await api.get(`/usuarios/mentorados/count`);
  return data;
}
