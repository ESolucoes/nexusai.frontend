import { useEffect, useRef, useState } from "react"
import MentoradoHeader from "../../components/layout/MentoradoHeader"
import "../../styles/mentorados/home.css"
import { api, getToken, uploadCurriculo, decodeJwt, getUsuarioById } from "../../lib/api"

function pickUserIdFromJwt(jwt?: string | null): string | null {
  const p = decodeJwt<any>(jwt)
  const candidates = [p?.sub, p?.id, p?.userId, p?.uid, p?.usuarioId, p?.user_id]
  const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0)
  return found ? String(found) : null
}

export default function HomePage() {
  const [usuario, setUsuario] = useState<{
    id?: string
    nome: string
    email: string
    avatarUrl?: string | null
    accountType: "Executive" | "First Class" | null
    mentoradoId?: string | null
    curriculoUrl?: string | null
    curriculoNome?: string | null
  }>({
    id: undefined,
    nome: "Carregando...",
    email: "",
    avatarUrl: null,
    accountType: null,
    mentoradoId: null,
    curriculoUrl: null,
    curriculoNome: null,
  })

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cvInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    document.body.classList.remove("login-bg")
    document.body.classList.add("no-scroll")
    return () => document.body.classList.remove("no-scroll")
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      const jwt = getToken()
      const userId = pickUserIdFromJwt(jwt)
      if (!jwt || !userId) {
        setUsuario((p) => ({ ...p, nome: "Usuário", email: "" }))
        return
      }

      try {
        const data = await getUsuarioById(userId)
        setUsuario({
          id: data.id,
          nome: data.nome ?? "Usuário",
          email: data.email ?? "",
          avatarUrl: data.avatarUrl ?? null,
          accountType: (data.mentorado?.tipo as "Executive" | "First Class") ?? null,
          mentoradoId: data.mentorado?.id ?? null,
          curriculoUrl: data.mentorado?.curriculo?.url ?? null,
          curriculoNome: data.mentorado?.curriculo?.filename ?? null,
        })
      } catch (err: any) {
        console.error(
          "[HomePage] GET /usuarios/{id} falhou:",
          err?.response?.status,
          err?.response?.data || err?.message,
        )
        setUsuario((prev) => ({
          ...prev,
          nome: "Usuário",
          email: "",
          avatarUrl: null,
          accountType: null,
          mentoradoId: null,
          curriculoUrl: null,
          curriculoNome: null,
        }))
      }
    })()
    return () => controller.abort()
  }, [])

  const avatarFallback = "/images/avatar.png"
  const avatarSrc =
    usuario.avatarUrl && usuario.avatarUrl.trim().length > 0 ? usuario.avatarUrl : avatarFallback

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!usuario.id) return
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append("file", file)
    try {
      const { data } = await api.post(`/usuarios/${usuario.id}/avatar`, formData)
      if (data?.url) setUsuario((prev) => ({ ...prev, avatarUrl: data.url }))
    } catch (err) {
      console.error("[HomePage] upload avatar falhou:", (err as any)?.response?.data ?? (err as any)?.message)
    }
  }

  function handleCvClick() {
    cvInputRef.current?.click()
  }

  async function handleCvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!usuario.mentoradoId) {
      alert("Finalize o cadastro de mentorado antes de enviar o currículo.")
      e.currentTarget.value = ""
      return
    }

    try {
      const res = await uploadCurriculo(usuario.mentoradoId, file)
      setUsuario((prev) => ({
        ...prev,
        curriculoUrl: res.url ?? null,
        curriculoNome: res.filename ?? file.name,
      }))
    } catch (err) {
      console.error("[HomePage] upload currículo falhou:", (err as any)?.response?.data ?? (err as any)?.message)
      alert("Falha no upload do currículo.")
    } finally {
      e.currentTarget.value = "" // permite reenviar o mesmo arquivo
    }
  }

  const badgeClass =
    usuario.accountType === "Executive"
      ? "mentorados-badge badge--executive"
      : usuario.accountType === "First Class"
      ? "mentorados-badge badge--firstclass"
      : "mentorados-badge hidden"

  const hasCv = Boolean(usuario.curriculoNome)

  return (
    <div className="mentorados-home">
      <MentoradoHeader />
      <div className="mentorados-cards">
        <div className="mentorados-card">
          <img
            src={avatarSrc}
            alt="Usuário"
            className="mentorados-avatar"
            draggable={false}
            onClick={() => fileInputRef.current?.click()}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement
              if (img.src !== window.location.origin + avatarFallback && img.src !== avatarFallback) {
                img.src = avatarFallback
              }
            }}
          />
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleAvatarChange}
          />
          <div className="mentorados-user-info">
            <h2>{usuario.nome}</h2>
            <p>{usuario.email}</p>
          </div>
          <span className={badgeClass}>{usuario.accountType ?? ""}</span>
        </div>

        {/* ===== Card do currículo ===== */}
        <div className={`mentorados-card mentorados-card--cv${hasCv ? " has-file" : ""}`}>
          {hasCv ? (
            // QUANDO JÁ TEM CURRÍCULO: botão fica embaixo do nome/baixar
            <div className="mentorados-cv-col">
              <div className="mentorados-cv-info">
                <h3>Currículo</h3>
                <p className="cv-file">
                  {usuario.curriculoNome}
                  {usuario.curriculoUrl ? (
                    <a
                      href={usuario.curriculoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="cv-download"
                    >
                      Baixar
                    </a>
                  ) : null}
                </p>
              </div>

              <button className="cv-upload-btn" onClick={handleCvClick}>
                Enviar novo Currículo (PDF/DOC/DOCX)
              </button>
            </div>
          ) : (
            // QUANDO NÃO TEM CURRÍCULO: mantém layout atual (botão à direita)
            <>
              <div className="mentorados-cv-info">
                <h3>Currículo</h3>
                <p className="cv-file cv-file--empty">Nenhum arquivo enviado</p>
              </div>

              <button className="cv-upload-btn" onClick={handleCvClick}>
                Enviar Currículo (PDF/DOC/DOCX)
              </button>
            </>
          )}

          <input
            type="file"
            ref={cvInputRef}
            style={{ display: "none" }}
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleCvChange}
          />
        </div>

        <img src="/images/dashboard.png" alt="" className="mentorados-center-image" draggable={false} />
      </div>
    </div>
  )
}
