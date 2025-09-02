// frontend/src/pages/mentorados/HomePage.tsx
import { useEffect, useRef, useState } from "react"
import MentoradoHeader from "../../components/layout/MentoradoHeader"
import "../../styles/mentorados/home.css"
import {
  api,
  getToken,
  uploadCurriculo,
  decodeJwt,
  getUsuarioById,
  listMentoradoAudios,
  uploadMentoradoAudio,
  downloadMentoradoAudio,
  fetchAudioBlob,
  downloadCurriculo,
} from "../../lib/api"
import type { MentoradoAudio } from "../../lib/api"

// Tabela de Vagas
import VagasTable from "../../components/mentorados/VagasTable"
// NOVO: Metas do SSI (vertical)
import SsiMetasVertical from "../../components/mentorados/SsiMetasVertical"

function pickUserIdFromJwt(jwt?: string | null): string | null {
  const p = decodeJwt<any>(jwt)
  const candidates = [p?.sub, p?.id, p?.userId, p?.uid, p?.usuarioId, p?.user_id]
  const found = candidates.find(
    (v) => typeof v === "string" && v.trim().length > 0,
  )
  return found ? String(found) : null
}

/* ============================ MODAL DE ÁUDIO ============================ */
function AudioRecorderModal(props: {
  open: boolean
  onClose: () => void
  mentoradoId: string
  onSaved?: (audio: MentoradoAudio) => void
}) {
  const { open, onClose, mentoradoId, onSaved } = props
  const [recording, setRecording] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [mics, setMics] = useState<MediaDeviceInfo[]>([])
  const [selectedMic, setSelectedMic] = useState<string>("")

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (open) {
      ;(async () => {
        try {
          const temp = await navigator.mediaDevices.getUserMedia({ audio: true })
          temp.getTracks().forEach((t) => t.stop())
          const devs = await navigator.mediaDevices.enumerateDevices()
          const inputs = devs.filter((d) => d.kind === "audioinput")
          setMics(inputs)
          if (!selectedMic && inputs[0]) setSelectedMic(inputs[0].deviceId)
          navigator.mediaDevices.ondevicechange = async () => {
            const ds = await navigator.mediaDevices.enumerateDevices()
            const ins = ds.filter((d) => d.kind === "audioinput")
            setMics(ins)
            if (ins.length && !ins.find((d) => d.deviceId === selectedMic)) {
              setSelectedMic(ins[0].deviceId)
            }
          }
        } catch {}
      })()
    }
    return () => {
      try {
        mediaRecRef.current?.stop()
      } catch {}
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      mediaRecRef.current = null
      mediaStreamRef.current = null
      chunksRef.current = []
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      setBlobUrl(null)
      setBlob(null)
      setRecording(false)
    }
  }, [open])

  async function start() {
    if (!navigator?.mediaDevices?.getUserMedia)
      return alert("Gravação não suportada neste navegador.")
    const constraints: MediaStreamConstraints = selectedMic
      ? ({ audio: { deviceId: { exact: selectedMic } } as MediaTrackConstraints })
      : { audio: true }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    mediaStreamRef.current = stream
    const rec = new MediaRecorder(stream, { mimeType: "audio/webm" })
    chunksRef.current = []
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    rec.onstop = () => {
      const b = new Blob(chunksRef.current, { type: "audio/webm" })
      setBlob(b)
      setBlobUrl(URL.createObjectURL(b))
    }
    mediaRecRef.current = rec
    rec.start()
    setRecording(true)
  }
  function stop() {
    try {
      mediaRecRef.current?.stop()
    } catch {}
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    setRecording(false)
  }
  async function save() {
    if (!blob) return
    try {
      const { ok, audio } = await uploadMentoradoAudio(mentoradoId, blob)
      if (!ok) throw new Error("upload falhou")
      onSaved?.(audio)
      onClose()
    } catch (err: any) {
      console.error("[Audio] upload falhou:", err?.response?.data ?? err?.message)
      alert("Falha ao salvar o áudio.")
    }
  }

  if (!open) return null
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 560,
          background: "#fff",
          borderRadius: 12,
          padding: 18,
          boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0 }}>Gravar áudio do mentorado</h3>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
          <label style={{ fontSize: 13, color: "#555", minWidth: 80 }}>Microfone:</label>
          <select
            value={selectedMic}
            onChange={(e) => setSelectedMic(e.target.value)}
            style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
          >
            {mics.length ? (
              mics.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Microfone ${i + 1}`}
                </option>
              ))
            ) : (
              <option value="">Permita o microfone para listar os dispositivos</option>
            )}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, margin: "14px 0" }}>
          {!recording && (
            <button onClick={start} className="cv-upload-btn">
              Iniciar Gravação
            </button>
          )}
          {recording && (
            <button onClick={stop} className="cv-upload-btn">
              Parar
            </button>
          )}
          {blobUrl && !recording && (
            <button onClick={save} className="cv-upload-btn">
              Salvar
            </button>
          )}
          <button onClick={onClose} className="cv-upload-btn">
            Fechar
          </button>
        </div>

        {blobUrl ? (
          <>
            <audio src={blobUrl} controls style={{ width: "100%" }} />
            <div style={{ marginTop: 6 }}>
              <a
                href={blobUrl}
                download={`gravacao-${Date.now()}.webm`}
                className="cv-download"
              >
                Baixar prévia
              </a>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#999" }}>Sem prévia ainda…</div>
        )}
      </div>
    </div>
  )
}

/* ============================ PÁGINA ============================ */

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

  const [audios, setAudios] = useState<MentoradoAudio[]>([])
  const [audioModalOpen, setAudioModalOpen] = useState(false)
  const [ultimoAudioSrc, setUltimoAudioSrc] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cvInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    document.body.classList.remove("login-bg")
    document.body.classList.add("no-scroll") // mantém como no seu layout
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
        const mentoradoId = data.mentorado?.id ?? null
        setUsuario({
          id: data.id,
          nome: data.nome ?? "Usuário",
          email: data.email ?? "",
          avatarUrl: data.avatarUrl ?? null,
          accountType: (data.mentorado?.tipo as "Executive" | "First Class") ?? null,
          mentoradoId,
          curriculoUrl: data.mentorado?.curriculo?.url ?? null,
          curriculoNome: data.mentorado?.curriculo?.filename ?? null,
        })

        if (mentoradoId) {
          const res = await listMentoradoAudios(mentoradoId).catch(() => null)
          if (res?.ok) setAudios(res.audios)
        }
      } catch (err) {
        console.error("[HomePage] GET /usuarios/{id} falhou:", err)
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
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!usuario.mentoradoId) return
      const last = audios?.[0]
      if (!last) {
        if (ultimoAudioSrc) URL.revokeObjectURL(ultimoAudioSrc)
        setUltimoAudioSrc(null)
        return
      }
      try {
        const { blob } = await fetchAudioBlob(usuario.mentoradoId, last)
        const url = URL.createObjectURL(blob)
        if (ultimoAudioSrc) URL.revokeObjectURL(ultimoAudioSrc)
        setUltimoAudioSrc(url)
      } catch (e) {
        console.error("[HomePage] carregar áudio falhou:", e)
      }
    })()
    return () => {
      if (ultimoAudioSrc) URL.revokeObjectURL(ultimoAudioSrc)
    }
  }, [audios, usuario.mentoradoId])

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
        curriculoUrl: res?.url ?? null,
        curriculoNome: res?.filename ?? file.name,
      }))
    } catch (err) {
      console.error("[HomePage] upload currículo falhou:", err)
      alert("Falha no upload do currículo.")
    } finally {
      e.currentTarget.value = ""
    }
  }

  async function handleCvDownload() {
    if (!usuario.mentoradoId) return
    try {
      await downloadCurriculo(usuario.mentoradoId)
    } catch (err: any) {
      console.error(
        "[HomePage] download currículo falhou:",
        err?.response?.data ?? err?.message,
      )
      alert("Falha ao baixar o currículo.")
    }
  }

  async function handleAudioDownload(a: MentoradoAudio) {
    if (!usuario.mentoradoId) return
    try {
      await downloadMentoradoAudio(usuario.mentoradoId, a)
    } catch (err: any) {
      console.error(
        "[HomePage] download áudio falhou:",
        err?.response?.data ?? err?.message,
      )
      alert("Falha ao baixar o áudio.")
    }
  }

  const badgeClass =
    usuario.accountType === "Executive"
      ? "mentorados-badge badge--executive"
      : usuario.accountType === "First Class"
      ? "mentorados-badge badge--firstclass"
      : "mentorados-badge hidden"

  const hasCv = Boolean(usuario.curriculoNome)
  const ultimoAudio = audios?.[0] || null

  return (
    <div className="mentorados-home">
      {/* ===== Scroll SÓ VERTICAL dentro da página ===== */}
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

          {/* CARD DO CURRÍCULO */}
          <div
            className={`mentorados-card mentorados-card--cv${
              hasCv ? " has-file" : ""
            }`}
          >
            {hasCv ? (
              <div className="mentorados-cv-col">
                <div
                  className="mentorados-cv-info"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div>
                    <h3>Currículo</h3>
                    <p className="cv-file">
                      {usuario.curriculoNome}
                      <button
                        onClick={handleCvDownload}
                        className="cv-download"
                        style={{ marginLeft: 8 }}
                      >
                        Baixar
                      </button>
                    </p>
                  </div>
                </div>
                <button className="cv-upload-btn" onClick={handleCvClick}>
                  Enviar novo Currículo (PDF/DOC/DOCX)
                </button>
              </div>
            ) : (
              <>
                <div
                  className="mentorados-cv-info"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    gap: 12,
                  }}
                >
                  <div>
                    <h3>Currículo</h3>
                    <p className="cv-file cv-file--empty">Nenhum arquivo enviado</p>
                  </div>
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

          {/* CARD DE ÁUDIO */}
          <div
            className="mentorados-card mentorados-card--audio"
            style={{
              position: "absolute",
              top: 25,
              left: "calc(var(--sidebar-w) + 725px)",
              width: 420,
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <h4 style={{ margin: 0 }}>Áudio</h4>
              <button
                className="cv-upload-btn"
                onClick={() => setAudioModalOpen(true)}
                title="Gravar áudio do mentorado"
              >
                Gravar Áudio
              </button>
            </div>

            <div style={{ marginTop: 2 }}>
              <div style={{ fontSize: 13, color: "#444", marginBottom: 6 }}>
                Último Áudio
              </div>
              {ultimoAudio ? (
                <>
                  <audio src={ultimoAudioSrc ?? ""} controls style={{ width: "100%" }} />
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      marginTop: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#777" }}>
                      {ultimoAudio.filename} • {(ultimoAudio.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      onClick={() => handleAudioDownload(ultimoAudio)}
                      className="cv-download"
                    >
                      Baixar
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "#999" }}>
                  Nenhuma gravação encontrada.
                </div>
              )}
            </div>
          </div>

          {/* NOVO: Metas do SSI em layout VERTICAL (ocupa a linha) */}
          <SsiMetasVertical />

          {/* Tabela de Vagas (fica fixa conforme seu CSS) */}
          <VagasTable pageSize={10} />

          <img
            src="/images/dashboard.png"
            alt=""
            className="mentorados-center-image"
            draggable={false}
          />
        </div>
      </div>

      {/* MODAL DE ÁUDIO */}
      {usuario.mentoradoId && (
        <AudioRecorderModal
          open={audioModalOpen}
          onClose={() => setAudioModalOpen(false)}
          mentoradoId={usuario.mentoradoId}
          onSaved={async (audio) => {
            setAudios((prev) => [audio, ...prev])
          }}
        />
      )}
    </div>
  )
}
