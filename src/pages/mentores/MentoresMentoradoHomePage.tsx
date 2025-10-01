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
  fetchAudioBlob, // === Currículo ===
  listMentoradoCurriculos,
  uploadCurriculos,
  uploadCurriculo,
  downloadCurriculo, // último (compat)
  downloadCurriculoByName, // por nome (novo)
  type MentoradoCurriculo,
  type MentoradoAudio,
} from "../../lib/api";

// Tabela de Vagas (mantida)
import VagasTable from "../../components/mentorados/VagasTable";

// Tabela única do SSI (substitui o antigo SsiDashboardTabela)
import MentoradoSsiTabela from "../../components/mentorados/MentoradoSsiTabela";

// Cronograma (8 semanas) + Rotina Fixa
import CronogramaSemanasTable from "../../components/mentorados/CronogramaSemanasTable";
import RotinaSemanalFixa from "../../components/mentorados/RotinaSemanalFixa";

/** Normaliza URL (caso backend retorne relativa) */
function resolveImageUrl(u?: string | null): string | null {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  const base = (api?.defaults?.baseURL || "").replace(/\/+$/, "");
  const path = String(u).replace(/^\/+/, "");
  if (!base) return `/${path}`;
  return `${base}/${path}`;
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
  const chunksRef = useRef<Blob[]>([]); // Descobre o melhor mime para gravar (tenta WAV, senão fallback)

  function pickBestMime(): string | undefined {
    const candidates = [
      "audio/wav",
      "audio/wave",
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    const isSup = (t: string) =>
      typeof (window as any).MediaRecorder !== "undefined" &&
      typeof MediaRecorder.isTypeSupported === "function" &&
      MediaRecorder.isTypeSupported(t);
    return candidates.find(isSup) || undefined;
  }

  useEffect(() => {
    if (open) {
      (async () => {
        try {
          const temp = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          temp.getTracks().forEach((t) => t.stop());
          const devs = await navigator.mediaDevices.enumerateDevices();
          const inputs = devs.filter((d) => d.kind === "audioinput");
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
    }
    return () => {
      try {
        mediaRecRef.current?.stop();
      } catch {}
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaRecRef.current = null;
      mediaStreamRef.current = null;
      chunksRef.current = [];
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      setBlob(null);
      setRecording(false);
    };
  }, [open]);

  async function start() {
    if (!navigator?.mediaDevices?.getUserMedia) {
      alert("Gravação não suportada neste navegador.");
      return;
    }
    const constraints: MediaStreamConstraints = selectedMic
      ? { audio: { deviceId: { exact: selectedMic } } }
      : { audio: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    mediaStreamRef.current = stream;

    const mimeType = pickBestMime();
    const rec = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      // Blob com o mesmo tipo usado pelo MediaRecorder (ou o default do browser)
      const finalType = rec.mimeType || mimeType || "audio/webm";
      const b = new Blob(chunksRef.current, { type: finalType });
      setBlob(b);
      setBlobUrl(URL.createObjectURL(b));
    };
    mediaRecRef.current = rec;
    rec.start();
    setRecording(true);
  }

  function stop() {
    try {
      mediaRecRef.current?.stop();
    } catch {}
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }

  async function save() {
    if (!blob) return;
    try {
      // uploadMentoradoAudio já garante nome compatível (.wav/.mp3) com base no tipo
      const { ok, audio } = await uploadMentoradoAudio(mentoradoId, blob);
      if (!ok) throw new Error("upload falhou");
      onSaved?.(audio);
      onClose();
    } catch (err: any) {
      console.error(
        "[Audio] upload falhou:",
        err?.response?.data ?? err?.message
      );
      alert(
        (err?.response?.data?.message as string) ||
          "Falha ao salvar o áudio. Verifique se o navegador permitiu o microfone."
      );
    }
  }

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
                 {" "}
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
                        <h3 style={{ margin: 0 }}>Gravar áudio do mentorado</h3>{" "}
               {" "}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginTop: 12,
          }}
        >
                             {" "}
          <label style={{ fontSize: 13, color: "#555", minWidth: 80 }}>
                        Microfone:          {" "}
          </label>
                             {" "}
          <select
            value={selectedMic}
            onChange={(e) => setSelectedMic(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 10px",
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          >
                                   {" "}
            {mics.length ? (
              mics.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                                                     {" "}
                  {d.label || `Microfone ${i + 1}`}                {" "}
                </option>
              ))
            ) : (
              <option value="">
                                Permita o microfone para listar os dispositivos
                             {" "}
              </option>
            )}
                                 {" "}
          </select>
                           {" "}
        </div>
                       {" "}
        <div style={{ display: "flex", gap: 10, margin: "14px 0" }}>
                             {" "}
          {!recording && (
            <button onClick={start} className="cv-upload-btn">
                            Iniciar Gravação            {" "}
            </button>
          )}
                             {" "}
          {recording && (
            <button onClick={stop} className="cv-upload-btn">
                            Parar            {" "}
            </button>
          )}
                             {" "}
          {blobUrl && !recording && (
            <button onClick={save} className="cv-upload-btn">
                            Salvar            {" "}
            </button>
          )}
                             {" "}
          <button onClick={onClose} className="cv-upload-btn">
                        Fechar          {" "}
          </button>
                           {" "}
        </div>
                       {" "}
        {blobUrl ? (
          <>
                                   {" "}
            <audio src={blobUrl} controls style={{ width: "100%" }} />          
             {" "}
            <div style={{ marginTop: 6 }}>
                                         {" "}
              {/* Baixa a PRÉVIA local; extensão meramente cosmética para o preview */}
                                         {" "}
              <a
                href={blobUrl}
                download={`gravacao-${Date.now()}${
                  (blob?.type || "").toLowerCase().includes("wav")
                    ? ".wav"
                    : (blob?.type || "").toLowerCase().includes("mpeg")
                    ? ".mp3"
                    : ".webm"
                }`}
                className="cv-download"
              >
                                                Baixar prévia              {" "}
              </a>
                                       {" "}
            </div>
                                 {" "}
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#999" }}>Sem prévia ainda…</div>
        )}
                     {" "}
      </div>
               {" "}
    </div>
  );
}

/* ============================ PÁGINA ============================ */
export default function MentoresMentoradoHomePage() {
  const [search] = useSearchParams();
  const location = useLocation() as any; // origem: /mentores/home/mentorado?id=:usuarioId  (ou via state { usuarioId, mentoradoId })
  const navigate = useNavigate(); // Hook de navegação // 1. Tenta pegar o ID do usuário (base para a página)

  const usuarioIdParam = (
    search.get("id") ||
    location?.state?.usuarioId ||
    ""
  ).trim(); // 2. Tenta pegar o ID do mentorado diretamente (se for passado explicitamente)
  const mentoradoIdParam = (
    search.get("mentoradoId") ||
    location?.state?.mentoradoId ||
    ""
  ).trim();

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
  }, []); // Carregar usuário + mentoradoId + audios + currículos

  useEffect(() => {
    (async () => {
      if (!usuarioIdParam) {
        setUsuario((p) => ({ ...p, nome: "Usuário", email: "" }));
        return;
      }
      try {
        const data = await getUsuarioById(usuarioIdParam); // === CORREÇÃO: Prioriza o mentoradoId do parâmetro, senão usa o que veio da API ===
        const mentoradoId = mentoradoIdParam || data.mentorado?.id || null;
        setUsuario({
          id: data.id,
          nome: data.nome ?? "Usuário",
          email: data.email ?? "",
          avatarUrl: resolveImageUrl(data.avatarUrl) ?? null, // normaliza
          accountType:
            (data.mentorado?.tipo as "Executive" | "First Class") ?? null,
          mentoradoId,
        });

        if (mentoradoId) {
          // Áudios
          const resAud = await listMentoradoAudios(mentoradoId).catch(
            () => null
          );
          if (resAud?.ok) setAudios(resAud.audios); // Currículos

          const resCv = await listMentoradoCurriculos(mentoradoId).catch(
            () => null
          ); // Ordena a lista do mais recente para o mais antigo (o primeiro é o último enviado)
          const sortedCv = resCv?.arquivos.sort(
            (a, b) =>
              new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
          );
          setCurriculos(sortedCv || []);
        }
      } catch (err) {
        console.error(
          "[MentoresMentoradoHomePage] GET /usuarios/{id} falhou:",
          err
        );
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
  }, [usuarioIdParam, mentoradoIdParam]); // Prévia do último áudio (sempre atualiza quando a lista mudar)

  useEffect(() => {
    (async () => {
      if (!usuario.mentoradoId) return;
      const last = audios?.[0];
      if (!last) {
        if (ultimoAudioSrc) URL.revokeObjectURL(ultimoAudioSrc);
        setUltimoAudioSrc(null);
        return;
      }
      try {
        const { blob } = await fetchAudioBlob(usuario.mentoradoId, last);
        const url = URL.createObjectURL(blob);
        if (ultimoAudioSrc) URL.revokeObjectURL(ultimoAudioSrc);
        setUltimoAudioSrc(url);
      } catch (e) {
        console.error("[MentoresMentoradoHomePage] carregar áudio falhou:", e);
      }
    })();
    return () => {
      if (ultimoAudioSrc) URL.revokeObjectURL(ultimoAudioSrc);
    };
  }, [audios, usuario.mentoradoId]);

  const avatarFallback = "/images/avatar.png";
  const avatarSrc =
    usuario.avatarUrl && usuario.avatarUrl.trim().length > 0
      ? usuario.avatarUrl
      : avatarFallback;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!usuario.id) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await api.post(
        `/usuarios/${usuario.id}/avatar`,
        formData
      );
      if (data?.url) {
        const absolute = resolveImageUrl(String(data.url));
        const busted = cacheBust(absolute);
        setUsuario((prev) => ({
          ...prev,
          avatarUrl: busted || absolute || data.url,
        }));
      }
    } catch (err) {
      console.error("[MentoresMentoradoHomePage] upload avatar falhou:", err);
    } finally {
      if (e.currentTarget) e.currentTarget.value = "";
    }
  }

  function handleCvClick() {
    cvInputRef.current?.click();
  }
  /**
   * REESCRITO: Função de upload de currículos.
   * - Suporta upload de 1 ou múltiplos arquivos.
   * - Atualiza a lista `curriculos` após o sucesso.
   */
  async function handleCvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!usuario.mentoradoId) {
      alert("Finalize o cadastro de mentorado antes de enviar o currículo.");
      e.currentTarget.value = "";
      return;
    }
    try {
      if (files.length === 1) {
        // Envia 1 arquivo (para compatibilidade, usa a função singular)
        await uploadCurriculo(usuario.mentoradoId, files[0]);
      } else {
        // Envia múltiplos arquivos (usa a função plural)
        await uploadCurriculos(usuario.mentoradoId, Array.from(files));
      } // Força o refresh da lista e reordena (mais recente primeiro)
      const res = await listMentoradoCurriculos(usuario.mentoradoId);
      const sortedCv = res.arquivos.sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );
      setCurriculos(sortedCv || []);
    } catch (err) {
      console.error(
        "[MentoresMentoradoHomePage] upload currículo falhou:",
        err
      );
      alert("Falha no upload do(s) currículo(s).");
    } finally {
      e.currentTarget.value = "";
    }
  }
  /**
   * REESCRITO: Função de download do currículo mais recente (usando a função de compatibilidade).
   */
  async function handleCvDownloadLatest() {
    if (!usuario.mentoradoId) return;
    try {
      // Usa a função mais antiga que baixa o último enviado
      await downloadCurriculo(usuario.mentoradoId);
    } catch (err: any) {
      console.error(
        "[MentoresMentoradoHomePage] download (último) falhou:",
        err?.response?.data ?? err?.message
      );
      alert("Falha ao baixar o currículo (último).");
    }
  }
  /**
   * REESCRITO: Função de download de um currículo específico pelo nome (nova função).
   */
  async function handleCvDownloadByName(filename: string) {
    if (!usuario.mentoradoId) return;
    try {
      // Usa a nova função que baixa pelo nome do arquivo
      await downloadCurriculoByName(usuario.mentoradoId, filename);
    } catch (err: any) {
      console.error(
        "[MentoresMentoradoHomePage] download por nome falhou:",
        err?.response?.data ?? err?.message
      );
      alert("Falha ao baixar o arquivo.");
    }
  } // NOVA FUNÇÃO: Lida com o clique no botão "Ver Perfil"

  function handleVerPerfilClick() {
    navigate("/dashboard/mentorado/perfil"); // Navega para a rota de perfil
  }

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
                 {" "}
      <div
        className="mentorados-scroll"
        style={{
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
                        <Header />        {" "}
        {idInvalido ? (
          <div style={{ padding: 24, color: "#b00020" }}>
                                    ID do usuário não informado. Volte e
            selecione um mentorado.          {" "}
          </div>
        ) : (
          <div className="mentorados-cards">
                                   {" "}
            {/* CARD DO USUÁRIO - Usa a classe base mentorados-card, com a largura do grid (grid-span-4) */}
                                   {" "}
            <div className="mentorados-card grid-span-4">
                                         {" "}
              <img
                src={avatarSrc}
                alt="Usuário"
                className="mentorados-avatar"
                draggable={false}
                onClick={() => fileInputRef.current?.click()}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (
                    img.src !== window.location.origin + avatarFallback &&
                    img.src !== avatarFallback
                  ) {
                    img.src = avatarFallback;
                  }
                }}
              />
                                         {" "}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleAvatarChange}
              />
                                         {" "}
              <div className="mentorados-user-info">
                                               {" "}
                {/* === CORREÇÃO: Aplicação da fonte Montserrat no nome (conforme solicitação anterior) === */}
                               {" "}
                <h2 style={{ fontFamily: "Montserrat" }}>{usuario.nome}</h2>    
                           {" "}
                {/* === CORREÇÃO: Aplicação da fonte Montserrat-Italic no e-mail (conforme solicitação anterior) === */}
                               {" "}
                <p style={{ fontFamily: "Montserrat-Italic" }}>
                                    {usuario.email}               {" "}
                </p>
                                               {" "}
                {/* === BOTÃO "VER PERFIL" ADICIONADO AQUI === */}             
                 {" "}
                <button
                  onClick={handleVerPerfilClick}
                  className="cv-upload-btn" // Reutilizando o estilo cv-upload-btn para manter a aparência
                  style={{
                    marginTop: 10,
                    padding: "8px 16px",
                    fontSize: 14, // Estilos para o botão "Ver Perfil"
                    background: "#5cb85c", // Um verde amigável para ação
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: "bold",
                    width: "fit-content",
                  }}
                >
                                    Ver Perfil                {" "}
                </button>
                                             {" "}
              </div>
                                         {" "}
              <span className={badgeClass}>{usuario.accountType ?? ""}</span>  
                       {" "}
            </div>
                                   {" "}
            {/* CARD DO CURRÍCULO - Largura de 4 colunas (grid-span-4) - REESCRITO */}
                                   {" "}
            <div
              className={`mentorados-card mentorados-card--cv grid-span-4${
                hasCv ? " has-file" : ""
              }`}
            >
                                         {" "}
              <div
                className="mentorados-cv-info"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
                  width: "100%",
                  height: "100%", // Ocupa todo o espaço vertical para o botão ir para o final
                }}
              >
                                               {" "}
                <div>
                                                      <h3>Currículos</h3>      
                             {" "}
                  {!hasCv && (
                    <p className="cv-file cv-file--empty">
                                            Nenhum arquivo enviado              
                           {" "}
                    </p>
                  )}
                                                     {" "}
                  {/* SEÇÃO DO ÚLTIMO CURRÍCULO (Foco) */}                     
                               {" "}
                  {ultimoCv && (
                    <div
                      style={{
                        marginBottom: 15,
                        paddingBottom: 8,
                        borderBottom: "1px solid rgba(255,255,255,0.3)",
                        color: "#fff",
                      }}
                    >
                                                                 {" "}
                      <p className="cv-file" style={{ margin: 0 }}>
                                                                       {" "}
                        <strong>Último:</strong>                        {" "}
                        {ultimoCv.originalName || ultimoCv.filename}            
                                 {" "}
                      </p>
                                                                 {" "}
                      <button
                        onClick={handleCvDownloadLatest}
                        className="cv-download"
                        style={{ marginTop: 8 }}
                      >
                                                                        Baixar
                        Último (Compat)                      {" "}
                      </button>
                                                               {" "}
                    </div>
                  )}
                                                     {" "}
                  {/* LISTA DOS CURRÍCULOS ANTERIORES */}                       
                             {" "}
                  {curriculos.length > 1 && (
                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: "auto",
                        paddingTop: 8,
                        color: "#fff",
                        fontSize: 14,
                      }}
                    >
                                                                 {" "}
                      <h4 style={{ margin: "0 0 8px 0", color: "#fff" }}>
                                                Histórico ({curriculos.length}{" "}
                        arquivos)                      {" "}
                      </h4>
                                                                 {" "}
                      {curriculos.map(
                        (
                          c,
                          index // Pula o primeiro, que já é o "último"
                        ) =>
                          index > 0 && (
                            <div
                              key={c.filename}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                                padding: "6px 0",
                              }}
                            >
                                                                               
                                       {" "}
                              <div
                                style={{
                                  flex: 1,
                                  color: "#fff",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                                                               
                                                {c.originalName || c.filename}  
                                                             {" "}
                                <span
                                  style={{
                                    color: "#eee",
                                    fontSize: 12,
                                    marginLeft: 8,
                                  }}
                                >
                                                                               
                                                       {" "}
                                  {new Date(c.savedAt).toLocaleDateString()}    
                                                             {" "}
                                </span>
                                                                               
                                             {" "}
                              </div>
                                                                               
                                       {" "}
                              <button
                                className="cv-download"
                                onClick={() =>
                                  handleCvDownloadByName(c.filename)
                                }
                              >
                                                                               
                                                Baixar                          
                                   {" "}
                              </button>
                                                                               
                                     {" "}
                            </div>
                          )
                      )}
                                                               {" "}
                    </div>
                  )}
                                                   {" "}
                </div>
                                                {/* BOTÃO DE UPLOAD */}         
                                     {" "}
                <button
                  className="cv-upload-btn"
                  onClick={handleCvClick}
                  style={{ marginTop: "auto" }}
                  disabled={!usuario.mentoradoId} // Desabilita se não tiver mentoradoId
                >
                                                      Enviar Currículo(s)
                  (PDF/DOC/DOCX)                {" "}
                </button>
                                             {" "}
              </div>
                                         {" "}
              <input
                type="file"
                ref={cvInputRef}
                style={{ display: "none" }}
                multiple
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleCvChange}
              />
                                       {" "}
            </div>
                                   {" "}
            {/* CARD DE ÁUDIO - Largura de 4 colunas (grid-span-4) - Mantido */}
                                   {" "}
            <div
              className="mentorados-card mentorados-card--audio grid-span-4"
              style={{
                background: "#fff",
                color: "#0f172a",
                padding: 16,
                boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                gap: 10,
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
                                         {" "}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                                               {" "}
                <h4 style={{ margin: 0, color: "#0f172a" }}>Áudio</h4>          
                     {" "}
                <button
                  className="cv-upload-btn"
                  onClick={() => setAudioModalOpen(true)}
                  title="Gravar áudio do mentorado"
                  disabled={!usuario.mentoradoId}
                  style={{
                    background: "#0d6efd",
                    color: "#fff",
                    border: "none",
                  }}
                >
                                                      Gravar Áudio              
                   {" "}
                </button>
                                             {" "}
              </div>
                                         {" "}
              <div style={{ marginTop: 2, width: "100%" }}>
                                               {" "}
                <div style={{ fontSize: 13, color: "#444", marginBottom: 6 }}>
                                    Último Áudio                {" "}
                </div>
                                               {" "}
                {audios?.[0] ? (
                  <>
                                                           {" "}
                    <audio
                      src={ultimoAudioSrc ?? ""}
                      controls
                      style={{ width: "100%" }}
                    />
                                                           {" "}
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        marginTop: 4,
                      }}
                    >
                                                                 {" "}
                      <span style={{ fontSize: 12, color: "#777" }}>
                                                                       {" "}
                        {audios[0].filename} •                        {" "}
                        {(audios[0].size / 1024).toFixed(1)} KB                
                             {" "}
                      </span>
                                                                 {" "}
                      <button
                        onClick={() =>
                          audios?.[0] &&
                          downloadMentoradoAudio(
                            usuario.mentoradoId!,
                            audios[0]
                          )
                        }
                        className="cv-download"
                      >
                                                                        Baixar  
                                           {" "}
                      </button>
                                                               {" "}
                    </div>
                                                         {" "}
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: "#999" }}>
                                        Nenhuma gravação encontrada.            
                         {" "}
                  </div>
                )}
                                             {" "}
              </div>
                                       {" "}
            </div>
                                   {" "}
            {/* === Tabela única do SSI (12 semanas) - Ocupa a linha inteira (grid-span-12) === */}
                                   {" "}
            <div className="grid-span-12">
                                          <MentoradoSsiTabela />            {" "}
            </div>
                                   {" "}
            {/* === Cronograma (8 semanas) + Rotina Fixa - Dividem a largura (grid-span-6) === */}
                                   {" "}
            <div className="grid-span-6">
                                         {" "}
              <CronogramaSemanasTable usuarioIdOverride={usuario.id} />        
                 {" "}
            </div>
                                   {" "}
            <div className="grid-span-6">
                                         {" "}
              <RotinaSemanalFixa usuarioIdOverride={usuario.id} />             {" "}
                         {" "}
            </div>
                       {" "}
            {/* Tabela de Vagas MOVIDA PARA O FINAL, antes da imagem de rodapé. Ocupa 12 colunas. */}
                                   {" "}
            <div className="grid-span-12">
                                          <VagasTable pageSize={10} />          
               {" "}
            </div>
                                   {" "}
            <img
              src="/images/dashboard.png"
              alt=""
              className="mentorados-center-image"
              draggable={false}
            />{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* MODAL DE ÁUDIO */}{" "}
      {usuario.mentoradoId && (
        <AudioRecorderModal
          open={audioModalOpen}
          onClose={() => setAudioModalOpen(false)}
          mentoradoId={usuario.mentoradoId}
          onSaved={async (audio) => {
            // coloca no topo e força recarregar preview
            setAudios((prev) => [audio, ...prev]);
          }}
        />
      )}{" "}
    </div>
  );
}
