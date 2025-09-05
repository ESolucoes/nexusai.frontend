import { useEffect, useRef, useState } from "react"
import MentoradoHeader from "../../components/layout/MentoradoHeader"
import "../../styles/mentorados/home.css"
import { api, getToken, decodeJwt, getUsuarioById } from "../../lib/api"

// Mantido: SSI (não vamos tocar dentro do componente)
import SsiMetasVertical from "../../components/mentorados/SsiMetasVertical"

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
  }>({
    id: undefined,
    nome: "Carregando...",
    email: "",
    avatarUrl: null,
    accountType: null,
  })

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    document.body.classList.remove("login-bg")
    document.body.classList.add("no-scroll")
    return () => document.body.classList.remove("no-scroll")
  }, [])

  useEffect(() => {
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
        })
      } catch (err) {
        console.error("[HomePage] GET /usuarios/{id} falhou:", err)
        setUsuario({
          id: undefined,
          nome: "Usuário",
          email: "",
          avatarUrl: null,
          accountType: null,
        })
      }
    })()
  }, [])

  const avatarFallback = "/images/avatar.png"
  const avatarSrc =
    usuario.avatarUrl && usuario.avatarUrl.trim().length > 0
      ? usuario.avatarUrl
      : avatarFallback

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
      console.error("[HomePage] upload avatar falhou:", err)
    }
  }

  const badgeClass =
    usuario.accountType === "Executive"
      ? "mentorados-badge badge--executive"
      : usuario.accountType === "First Class"
      ? "mentorados-badge badge--firstclass"
      : "mentorados-badge hidden"

  return (
    <div className="mentorados-home">
      <div
        className="mentorados-scroll"
        style={{
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <MentoradoHeader />

        <div className="mentorados-cards">
          {/* CARD DO USUÁRIO */}
          <div className="mentorados-card">
            <img
              src={avatarSrc}
              alt="Usuário"
              className="mentorados-avatar"
              draggable={false}
              onClick={() => fileInputRef.current?.click()}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement
                if (
                  img.src !== window.location.origin + avatarFallback &&
                  img.src !== avatarFallback
                ) {
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

          {/* SSI (sem wrapper extra; não alteramos o conteúdo/estilos internos) */}
          <SsiMetasVertical />
        </div>

        <img
          src="/images/dashboard.png"
          alt=""
          className="mentorados-center-image"
          draggable={false}
        />
      </div>
    </div>
  )
}
