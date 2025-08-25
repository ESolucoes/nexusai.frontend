import { api } from "../api"

export async function uploadCurriculo(mentoradoId: string, file: File) {
  const form = new FormData()
  form.append("file", file)
  const { data } = await api.post(`/mentorados/${mentoradoId}/curriculo`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data as {
    sucesso: boolean
    storageKey: string
    filename: string
    mime: string
    tamanho: number
    url?: string | null
  }
}
