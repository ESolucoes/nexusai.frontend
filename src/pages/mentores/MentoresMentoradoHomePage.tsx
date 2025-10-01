// frontend/src/pages/mentores/MentoresMentoradoHomePage.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import "../../styles/mentorados/home.css";
import {
  api,
  getUsuarioById,
  listMentoradoAudios,
  uploadMentoradoAudio,
  downloadMentoradoAudio,
  fetchAudioBlob,
  listMentoradoCurriculos,
  uploadCurriculo,
  uploadCurriculos,
  downloadCurriculo,
  downloadCurriculoByName,
  type MentoradoCurriculo,
  type MentoradoAudio,
} from "../../lib/api";

import VagasTable from "../../components/mentorados/VagasTable";
import MentoradoSsiTabela from "../../components/mentorados/MentoradoSsiTabela";
import CronogramaSemanasTable from "../../components/mentorados/CronogramaSemanasTable";
import RotinaSemanalFixa from "../../components/mentorados/RotinaSemanalFixa";

/** Normaliza URL (caso backend retorne relativa) */
function resolveImageUrl(u?: string | null): string | null {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  const base = (api?.defaults?.baseURL || "").replace(/\/+$/, "");
  const path = String(u).replace(/^\/+/, "");
  return base ? `${base}/${path}` : `/${path}`;
}

/** Adiciona cache-busting pra refletir avatar atualizado na hora */
function cacheBust(u?: string | null): string | null {
  if (!u) return u ?? null;
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}t=${Date.now()}`;
}

/* ============================ MODAL DE ÁUDIO ============================ */
function AudioRecorderModal(props: {
  open: boolean;
  onClose: () => void;
  mentoradoId: string;
  onSaved?: (audio: MentoradoAudio) => void;
}) {
  const { open, onClose, mentoradoId, onSaved } = props;
  const [recording, setRecording] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>("");

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const pickBestMime = () => {
    const candidates = [
      "audio/wav",
      "audio/wave",
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    return candidates.find(
      (t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)
    );
  };

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    (async () => {
      try {
        const temp = await navigator.mediaDevices.getUserMedia({ audio: true });
        temp.getTracks().forEach((t) => t.stop());
        const devs = await navigator.mediaDevices.enumerateDevices();
        const inputs = devs.filter((d) => d.kind === "audioinput");
        if (!mounted) return;
        setMics(inputs);
        if (!selectedMic && inputs[0]) setSelectedMic(inputs[0].deviceId);

        navigator.mediaDevices.ondevicechange = async () => {
          const ds = await navigator.mediaDevices.enumerateDevices();
          const ins = ds.filter((d) => d.kind === "audioinput");
          setMics(ins);
          if (ins.length && !ins.find((d) => d.deviceId === selectedMic)) {
            setSelectedMic(ins[0].deviceId);
          }
        };
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
      mediaRecRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaRecRef.current = null;
      mediaStreamRef.current = null;
      chunksRef.current = [];
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      setBlob(null);
      setRecording(false);
      navigator.mediaDevices.ondevicechange = null as any;
    };
  }, [open, selectedMic, blobUrl]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Gravação não suportada neste navegador.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia(
      selectedMic ? { audio: { deviceId: { exact: selectedMic } } } : { audio: true }
    );
    mediaStreamRef.current = stream;

    const mimeType = pickBestMime();
    const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const finalType = rec.mimeType || mimeType || "audio/webm";
      const b = new Blob(chunksRef.current, { type: finalType });
      setBlob(b);
      setBlobUrl(URL.createObjectURL(b));
    };

    mediaRecRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const stop = () => {
    mediaRecRef.current?.stop();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  const save = async () => {
    if (!blob) return;
    try {
      const { ok, audio } = await uploadMentoradoAudio(mentoradoId, blob);
      if (!ok) throw new Error("upload falhou");
      onSaved?.(audio);
      onClose();
    } catch (err: any) {
      console.error("[Audio] upload falhou:", err?.response?.data ?? err?.message);
      alert(
        (err?.response?.data?.message as string) ||
          "Falha ao salvar o áudio. Verifique se o navegador permitiu o microfone."
      );
    }
  };

  if (!open) return null;

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
        <h3>Gravar áudio do mentorado</h3>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
          <label style={{ fontSize: 13, color: "#555", minWidth: 80 }}>Microfone:</label>
          <select
            value={selectedMic}
            onChange={(e) => setSelectedMic(e.target.value)}
            style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
          >
            {mics.length
              ? mics.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Microfone ${i + 1}`}
                  </option>
                ))
              : <option value="">Permita o microfone para listar os dispositivos</option>}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, margin: "14px 0" }}>
          {!recording && <button onClick={start} className="cv-upload-btn">Iniciar Gravação</button>}
          {recording && <button onClick={stop} className="cv-upload-btn">Parar</button>}
          {blobUrl && !recording && <button onClick={save} className="cv-upload-btn">Salvar</button>}
          <button onClick={onClose} className="cv-upload-btn">Fechar</button>
        </div>

        {blobUrl ? (
          <>
            <audio src={blobUrl} controls style={{ width: "100%" }} />
            <div style={{ marginTop: 6 }}>
              <a
                href={blobUrl}
                download={`gravacao-${Date.now()}${
                  blob?.type.includes("wav") ? ".wav" : blob?.type.includes("mpeg") ? ".mp3" : ".webm"
                }`}
                className="cv-download"
              >
                Baixar prévia
              </a>
            </div>
          </>
        ) : <div style={{ fontSize: 13, color: "#999" }}>Sem prévia ainda…</div>}
      </div>
    </div>
  );
}

/* ============================ PÁGINA ============================ */
export default function MentoresMentoradoHomePage() {
  const [search] = useSearchParams();
  const location = useLocation() as any;
  const navigate = useNavigate();

  const usuarioIdParam = (search.get("id") || location?.state?.usuarioId || "").trim();
  const mentoradoIdParam = (search.get("mentoradoId") || location?.state?.mentoradoId || "").trim();

  const [usuario, setUsuario] = useState<{
    id?: string;
    nome: string;
    email: string;
    avatarUrl?: string | null;
    accountType: "Executive" | "First Class" | null;
    mentoradoId?: string | null;
  }>({
    id: undefined,
    nome: "Carregando...",
    email: "",
    avatarUrl: null,
    accountType: null,
    mentoradoId: null,
  });

  const [curriculos, setCurriculos] = useState<MentoradoCurriculo[]>([]);
  const [audios, setAudios] = useState<MentoradoAudio[]>([]);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [ultimoAudioSrc, setUltimoAudioSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cvInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.body.classList.remove("login-bg");
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, []);

  /** Carrega usuário, currículos e áudios */
  useEffect(() => {
    if (!usuarioIdParam) {
      setUsuario((p) => ({ ...p, nome: "Usuário", email: "" }));
      return;
    }

    (async () => {
      try {
        const data = await getUsuarioById(usuarioIdParam);
        const mentoradoId = mentoradoIdParam || data.mentorado?.id || null;
        setUsuario({
          id: data.id,
          nome: data.nome ?? "Usuário",
          email: data.email ?? "",
          avatarUrl: resolveImageUrl(data.avatarUrl) ?? null,
          accountType: (data.mentorado?.tipo as "Executive" | "First Class") ?? null,
          mentoradoId,
        });

        if (mentoradoId) {
          const resAud = await listMentoradoAudios(mentoradoId).catch(() => null);
          if (resAud?.ok) setAudios(resAud.audios);

          const resCv = await listMentoradoCurriculos(mentoradoId).catch(() => null);
          const sortedCv = resCv?.arquivos?.sort(
            (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
          );
          setCurriculos(sortedCv || []);
        }
      } catch (err) {
        console.error("[MentoresMentoradoHomePage] GET /usuarios/{id} falhou:", err);
        setUsuario({
          id: undefined,
          nome: "Usuário",
          email: "",
          avatarUrl: null,
          accountType: null,
          mentoradoId: null,
        });
        setCurriculos([]);
      }
    })();
  }, [usuarioIdParam, mentoradoIdParam]);

  /** Prévia do último áudio */
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!usuario.mentoradoId) return;
      const last = audios?.[0];
      if (!last) {
        if (ultimoAudioSrc) URL.revokeObjectURL(ultimoAudioSrc);
        if (mounted) setUltimoAudioSrc(null);
        return;
      }
      try {
        const { blob } = await fetchAudioBlob(usuario.mentoradoId, last);
        const url = URL.createObjectURL(blob);
        if (!mounted) return;
        if (ultimoAudioSrc) URL.revokeObjectURL(ultimoAudioSrc);
        setUltimoAudioSrc(url);
      } catch (e) {
        console.error("[MentoresMentoradoHomePage] carregar áudio falhou:", e);
      }
    })();
    return () => {
      mounted = false;
      if (ultimoAudioSrc) URL.revokeObjectURL(ultimoAudioSrc);
    };
  }, [audios, usuario.mentoradoId]);

  const avatarFallback = "/images/avatar.png";
  const avatarSrc = usuario.avatarUrl?.trim() ? usuario.avatarUrl : avatarFallback;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!usuario.id) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await api.post(`/usuarios/${usuario.id}/avatar`, formData);
      if (data?.url) {
        const absolute = resolveImageUrl(String(data.url));
        const busted = cacheBust(absolute);
        setUsuario((prev) => ({ ...prev, avatarUrl: busted || absolute || data.url }));
      }
    } catch (err) {
      console.error("[MentoresMentoradoHomePage] upload avatar falhou:", err);
    } finally {
      e.currentTarget.value = "";
    }
  };

  const handleCvClick = () => cvInputRef.current?.click();

  const handleCvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !usuario.mentoradoId) return;
    try {
      if (files.length === 1) await uploadCurriculo(usuario.mentoradoId, files[0]);
      else await uploadCurriculos(usuario.mentoradoId, Array.from(files));
      const res = await listMentoradoCurriculos(usuario.mentoradoId);
      const sortedCv = res.arquivos.sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );
      setCurriculos(sortedCv || []);
    } catch (err) {
      console.error("[MentoresMentoradoHomePage] upload currículo falhou:", err);
      alert("Falha no upload do(s) currículo(s).");
    } finally {
      e.currentTarget.value = "";
    }
  };

  const handleCvDownloadLatest = async () => {
    if (!usuario.mentoradoId) return;
    try {
      await downloadCurriculo(usuario.mentoradoId);
    } catch (err: any) {
      console.error("[MentoresMentoradoHomePage] download (último) falhou:", err?.response?.data ?? err?.message);
      alert("Falha ao baixar o currículo (último).");
    }
  };

  const handleCvDownloadByName = async (filename: string) => {
    if (!usuario.mentoradoId) return;
    try {
      await downloadCurriculoByName(usuario.mentoradoId, filename);
    } catch (err: any) {
      console.error("[MentoresMentoradoHomePage] download por nome falhou:", err?.response?.data ?? err?.message);
      alert("Falha ao baixar o arquivo.");
    }
  };

  const handleVerPerfilClick = () => {
    if (!usuario.mentoradoId) {
      alert("Mentorado não encontrado. Verifique se o mentorado já foi cadastrado.");
      return;
    }
    navigate(`/dashboard/mentorado/perfil?mentoradoId=${encodeURIComponent(usuario.mentoradoId)}`);
  };

  const badgeClass =
    usuario.accountType === "Executive"
      ? "mentorados-badge badge--executive"
      : usuario.accountType === "First Class"
      ? "mentorados-badge badge--firstclass"
      : "mentorados-badge hidden";

  const hasCv = curriculos.length > 0;
  const ultimoCv = hasCv ? curriculos[0] : null;
  const idInvalido = !usuarioIdParam;

  return (
    <div className="mentorados-home">
      <div className="mentorados-scroll" style={{ height: "100vh", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" }}>
        <Header />

        {idInvalido ? (
          <div style={{ padding: 24, color: "#b00020" }}>ID do usuário não informado. Volte e selecione um mentorado.</div>
        ) : (
          <div className="mentorados-cards">
            {/* CARD USUÁRIO */}
            <div className="mentorados-card grid-span-4">
              <img
                src={avatarSrc}
                alt="Usuário"
                className="mentorados-avatar"
                draggable={false}
                onClick={() => fileInputRef.current?.click()}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== window.location.origin + avatarFallback && img.src !== avatarFallback) img.src = avatarFallback;
                }}
              />
              <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleAvatarChange} />

              <div className="mentorados-user-info">
                <h2 style={{ fontFamily: "Montserrat" }}>{usuario.nome}</h2>
                <p style={{ fontFamily: "Montserrat-Italic" }}>{usuario.email}</p>
                <button onClick={handleVerPerfilClick} className="cv-upload-btn" style={{ marginTop: 10, padding: "8px 16px", fontSize: 14, background: "#5cb85c", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", width: "fit-content" }}>
                  Ver Perfil
                </button>
              </div>
              <span className={badgeClass}>{usuario.accountType ?? ""}</span>
            </div>

            {/* CARD CURRÍCULO */}
            <div className={`mentorados-card mentorados-card--cv grid-span-4${hasCv ? " has-file" : ""}`}>
              <div className="mentorados-cv-info" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12, width: "100%", height: "100%" }}>
                <div>
                  <h3>Currículos</h3>
                  {!hasCv && <p className="cv-file cv-file--empty">Nenhum arquivo enviado</p>}
                  {ultimoCv && (
                    <div style={{ marginBottom: 15, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.3)", color: "#fff" }}>
                      <p className="cv-file" style={{ margin: 0 }}>
                        <strong>Último:</strong> {ultimoCv.originalName || ultimoCv.filename}
                      </p>
                      <button onClick={handleCvDownloadLatest} className="cv-download" style={{ marginTop: 8 }}>
                        Baixar Último (Compat)
                      </button>
                    </div>
                  )}
                  {curriculos.length > 1 && (
                    <div style={{ maxHeight: 180, overflowY: "auto", paddingTop: 8, color: "#fff", fontSize: 14 }}>
                      <h4 style={{ margin: "0 0 8px 0", color: "#fff" }}>Histórico ({curriculos.length} arquivos)</h4>
                      {curriculos.slice(1).map((c) => (
                        <div key={c.filename} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "6px 0" }}>
                          <div style={{ flex: 1, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.originalName || c.filename} <span style={{ color: "#eee", fontSize: 12, marginLeft: 8 }}>{new Date(c.savedAt).toLocaleDateString()}</span>
                          </div>
                          <button className="cv-download" onClick={() => handleCvDownloadByName(c.filename)}>Baixar</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className="cv-upload-btn" onClick={handleCvClick} style={{ marginTop: "auto" }} disabled={!usuario.mentoradoId}>
                  Enviar Currículo(s) (PDF/DOC/DOCX)
                </button>
              </div>
              <input type="file" ref={cvInputRef} style={{ display: "none" }} multiple accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleCvChange} />
            </div>

            {/* CARD ÁUDIO */}
            <div className="mentorados-card mentorados-card--audio grid-span-4" style={{ background: "#fff", color: "#0f172a", padding: 16, boxShadow: "0 6px 16px rgba(0,0,0,0.12)", gap: 10, flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <h4 style={{ margin: 0, color: "#0f172a" }}>Áudio</h4>
                <button className="cv-upload-btn" onClick={() => setAudioModalOpen(true)} title="Gravar áudio do mentorado" disabled={!usuario.mentoradoId} style={{ background: "#0d6efd", color: "#fff", border: "none" }}>
                  Gravar Áudio
                </button>
              </div>

              <div style={{ marginTop: 2, width: "100%" }}>
                <div style={{ fontSize: 13, color: "#444", marginBottom: 6 }}>Último Áudio</div>
                {audios?.[0] ? (
                  <>
                    <audio src={ultimoAudioSrc ?? ""} controls style={{ width: "100%" }} />
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: "#777" }}>{audios[0].filename} • {(audios[0].size / 1024).toFixed(1)} KB</span>
                      <button onClick={() => audios?.[0] && downloadMentoradoAudio(usuario.mentoradoId!, audios[0])} className="cv-download">Baixar</button>
                    </div>
                  </>
                ) : <div style={{ fontSize: 13, color: "#999" }}>Nenhuma gravação encontrada.</div>}
              </div>
            </div>

            {/* SSI, Cronograma e Vagas */}
            <div className="grid-span-12"><MentoradoSsiTabela /></div>
            <div className="grid-span-6"><CronogramaSemanasTable usuarioIdOverride={usuario.id} /></div>
            <div className="grid-span-6"><RotinaSemanalFixa usuarioIdOverride={usuario.id} /></div>
            <div className="grid-span-12"><VagasTable pageSize={10} /></div>

            <img src="/images/dashboard.png" alt="" className="mentorados-center-image" draggable={false} />
          </div>
        )}
      </div>

      {usuario.mentoradoId && (
        <AudioRecorderModal
          open={audioModalOpen}
          onClose={() => setAudioModalOpen(false)}
          mentoradoId={usuario.mentoradoId}
          onSaved={(audio) => setAudios((prev) => [audio, ...prev])}
        />
      )}
    </div>
  );
}
