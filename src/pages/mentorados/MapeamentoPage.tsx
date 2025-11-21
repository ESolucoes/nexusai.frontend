// frontend/src/pages/mentorados/MapeamentoPage.tsx

import { useEffect, useRef, useState } from "react";
import MentoradoHeader from "../../components/layout/MentoradoHeader";
import "../../styles/mentorados/mapeamento.css";
import {
  getToken,
  uploadCurriculo,
  decodeJwt,
  getUsuarioById,
  listMentoradoAudios,
  uploadMentoradoAudio,
  downloadMentoradoAudio,
  fetchAudioBlob,
  downloadCurriculo,
  downloadCurriculoByName,
  listMentoradoCurriculos,
  type MentoradoAudio,
  getLatestCurriculoInfo,
  type MentoradoCurriculo,
} from "../../lib/api";

// Tabela de Vagas
import VagasTable from "../../components/mentorados/VagasTable";

// Função utilitária para extrair ID do JWT
function pickUserIdFromJwt(jwt?: string | null): string | null {
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

/* ============================ Utils: WAV Encoder ============================ */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  // PCM 16-bit mono
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  }

  function floatTo16BitPCM(
    output: DataView,
    offset: number,
    input: Float32Array
  ) {
    let pos = offset;
    for (let i = 0; i < input.length; i++, pos += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);
  return new Blob([view], { type: "audio/wav" });
}

/* ============================ MODAL DE ÁUDIO (gera WAV) ============================ */
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

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(44100);

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
        } catch {}
      })();
    }
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function cleanup() {
    try {
      procRef.current?.disconnect();
    } catch {}
    try {
      sourceRef.current?.disconnect();
    } catch {}
    try {
      ctxRef.current?.close();
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current = null;
    procRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setBlob(null);
    setRecording(false);
  }

  async function start() {
    if (!navigator?.mediaDevices?.getUserMedia)
      return alert("Gravação não suportada neste navegador.");

    const constraints: MediaStreamConstraints = selectedMic
      ? { audio: { deviceId: { exact: selectedMic } } as MediaTrackConstraints }
      : { audio: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    ctxRef.current = ctx;
    sampleRateRef.current = ctx.sampleRate;

    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;

    const proc = ctx.createScriptProcessor(4096, 1, 1);
    procRef.current = proc;

    chunksRef.current = [];
    proc.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      // copia o chunk pra evitar GC do buffer
      chunksRef.current.push(new Float32Array(input));
    };

    source.connect(proc);
    proc.connect(ctx.destination);
    setRecording(true);
  }

  function stop() {
    setRecording(false);
    // concatena e gera WAV
    const bufs = chunksRef.current;
    const length = bufs.reduce((acc, b) => acc + b.length, 0);
    const mono = new Float32Array(length);
    let offset = 0;
    for (const b of bufs) {
      mono.set(b, offset);
      offset += b.length;
    }
    const wav = encodeWAV(mono, sampleRateRef.current || 44100);
    setBlob(wav);
    const url = URL.createObjectURL(wav);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(url);
    cleanup();
  }

  async function save() {
    if (!blob) return;
    try {
      const { ok, audio } = await uploadMentoradoAudio(mentoradoId, blob);
      if (!ok) throw new Error("upload falhou");
      onSaved?.(audio);
      onClose();
    } catch (err: any) {
      console.error(
        "[Audio] upload falhou:",
        err?.response?.data ?? err?.message
      );
      alert("Falha ao salvar o áudio.");
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
      <div
        style={{
          width: "min(560px, 95vw)",
          background: "#fff",
          borderRadius: 12,
          padding: 18,
          boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0 }}>Gravar áudio do mentorado</h3>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <label style={{ fontSize: 13, color: "#555", minWidth: 80 }}>
            Microfone:
          </label>
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
            {mics.length ? (
              mics.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Microfone ${i + 1}`}
                </option>
              ))
            ) : (
              <option value="">
                Permita o microfone para listar os dispositivos
              </option>
            )}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, margin: "14px 0", flexWrap: "wrap" }}>
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
                download={`gravacao-${Date.now()}.wav`}
                className="cv-download"
              >
                Baixar prévia (WAV)
              </a>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#999" }}>Sem prévia ainda…</div>
        )}
      </div>
    </div>
  );
}

/* ============================ COMPONENTE VAGAS INTEGRADO ============================ */
function VagasSection({ pageSize = 10 }: { pageSize?: number }) {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<any[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const quantidade = pageSize;

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const { listMyVagaLinks } = await import("../../lib/api");
      const res = await listMyVagaLinks(pagina, quantidade);
      setItens(res.itens);
      setTotal(res.total);
    } catch (error: any) {
      setErr("Falha ao carregar vagas");
      console.error("Erro ao carregar vagas:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [pagina, quantidade]);

  const totalPaginas = Math.max(1, Math.ceil(total / quantidade));

  function normalizeUrl(raw: string) {
    const s = (raw || "").trim();
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) return `https://${s}`;
    return s;
  }

  async function handleSave() {
    const normalized = normalizeUrl(url);
    if (!normalized || !/[.]/.test(normalized)) {
      setErr("Informe um link válido.");
      return;
    }
    
    setSaving(true);
    setErr(null);
    try {
      const { createMyVagaLink } = await import("../../lib/api");
      await createMyVagaLink({ url: normalized });
      setUrl("");
      
      if (pagina === 1) {
        await load();
      } else {
        setPagina(1);
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Falha ao salvar o link.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Tem certeza que deseja remover esta vaga?")) {
      return;
    }

    setRemoving(id);
    setErr(null);
    
    try {
      const { removeMyVagaLink } = await import("../../lib/api");
      await removeMyVagaLink(id);
      await load();
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Falha ao remover a vaga");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="vagas-card-integrated">
      <div className="vagas-card__header">
        <h3 style={{ margin: 0 }}>Links de Vagas</h3>
        <div className="vagas-card__pager">
          <span style={{ fontSize: 14, color: "#666" }}>
            Total: {total} {total === 1 ? 'item' : 'itens'}
          </span>
          <button
            disabled={pagina <= 1}
            onClick={() => setPagina(p => Math.max(1, p - 1))}
          >
            {"<"}
          </button>
          <span style={{ fontSize: 14, color: "#666", minWidth: "60px", textAlign: "center" }}>
            {pagina} / {totalPaginas}
          </span>
          <button
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
          >
            {">"}
          </button>
        </div>
      </div>

      {/* Formulário de adicionar nova vaga */}
      <div className="vagas-form">
        <div className="vagas-input-group">
          <input
            type="text"
            placeholder="Cole o link da vaga (ex: https://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? handleSave() : undefined)}
          />
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="cv-upload-btn"
          >
            {saving ? "Salvando..." : "Adicionar"}
          </button>
        </div>
        {err && <div className="vagas-error">{err}</div>}
      </div>

      {/* Lista de vagas */}
      <div className="vagas-list">
        {loading ? (
          <div className="vagas-loading">Carregando…</div>
        ) : itens.length === 0 ? (
          <div className="vagas-empty">
            Nenhum link cadastrado. Adicione o primeiro link acima.
          </div>
        ) : (
          <div className="vagas-items">
            {itens.map((v) => (
              <div key={v.id} className="vagas-item">
                <a
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                  className="vagas-link"
                  title={v.titulo || v.url}
                >
                  {v.titulo || v.url}
                </a>
                
                <span className="vagas-date">
                  {new Date(v.criadoEm).toLocaleDateString()}
                </span>
                
                <button
                  onClick={() => handleRemove(v.id)}
                  disabled={removing === v.id}
                  className="vagas-remove-btn"
                  title="Remover vaga"
                >
                  {removing === v.id ? "..." : "Remover"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ PÁGINA ============================ */

export default function MapeamentoPage() {
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

  const [curriculoInfo, setCurriculoInfo] = useState<MentoradoCurriculo | null>(
    null
  );
  const [curriculosHistorico, setCurriculosHistorico] = useState<
    MentoradoCurriculo[]
  >([]);

  const [audios, setAudios] = useState<MentoradoAudio[]>([]);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [ultimoAudioSrc, setUltimoAudioSrc] = useState<string | null>(null);

  const cvInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.body.classList.remove("login-bg");
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, []);

  // useEffect 1: Carrega dados do Usuário/Mentorado
  useEffect(() => {
    (async () => {
      const jwt = getToken();
      const userId = pickUserIdFromJwt(jwt);
      if (!jwt || !userId) {
        setUsuario((p) => ({ ...p, nome: "Usuário", email: "" }));
        return;
      }

      try {
        const data = await getUsuarioById(userId);
        const mentoradoId = data.mentorado?.id ?? null;
        setUsuario({
          id: data.id,
          nome: data.nome ?? "Usuário",
          email: data.email ?? "",
          avatarUrl: data.avatarUrl ?? null,
          accountType:
            (data.mentorado?.tipo as "Executive" | "First Class") ?? null,
          mentoradoId,
        });

        // Carrega áudios junto
        if (mentoradoId) {
          const res = await listMentoradoAudios(mentoradoId).catch(() => null);
          if (res?.ok) setAudios(res.audios);
        }
      } catch (err) {
        console.error("[MapeamentoPage] GET /usuarios/{id} falhou:", err);
        setUsuario((prev) => ({
          ...prev,
          nome: "Usuário",
          email: "",
          avatarUrl: null,
          accountType: null,
          mentoradoId: null,
        }));
      }
    })();
  }, []);

  // useEffect 2: Carrega a informação do último currículo
  useEffect(() => {
    const mentoradoId = usuario.mentoradoId;
    if (!mentoradoId) return;
    (async () => {
      try {
        const info = await getLatestCurriculoInfo(mentoradoId);
        setCurriculoInfo(info);
      } catch (err) {
        console.error(
          "[MapeamentoPage] Falha ao carregar info do currículo:",
          err
        );
        setCurriculoInfo(null);
      }
    })();
  }, [usuario.mentoradoId]);

  // useEffect 3: Carrega a lista completa de currículos para o Histórico
  useEffect(() => {
    const mentoradoId = usuario.mentoradoId;
    if (!mentoradoId) return;
    (async () => {
      try {
        const { arquivos } = await listMentoradoCurriculos(mentoradoId);
        setCurriculosHistorico(arquivos);
      } catch (err: any) {
        const is404 = err?.response?.status === 404;
        if (!is404) {
          console.error(
            "[MapeamentoPage] Falha ao carregar lista de currículos:",
            err
          );
        }
        setCurriculosHistorico([]);
      }
    })();
  }, [usuario.mentoradoId]);

  // useEffect 4: Carrega a URL do último áudio
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
        console.error("[MapeamentoPage] carregar áudio falhou:", e);
      }
    })();
    return () => {
      if (ultimoAudioSrc) URL.revokeObjectURL(ultimoAudioSrc);
    };
  }, [audios, usuario.mentoradoId]);

  function handleCvClick() {
    cvInputRef.current?.click();
  }

  // Lógica de Upload de Currículo
  async function handleCvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!usuario.mentoradoId) {
      alert("Finalize o cadastro de mentorado antes de enviar o currículo.");
      e.currentTarget.value = "";
      return;
    }
    try {
      const res = await uploadCurriculo(usuario.mentoradoId, file);

      const novoCurriculoInfo: MentoradoCurriculo = {
        filename: res.storageKey,
        originalName: res.filename,
        mime: res.mime,
        size: res.tamanho,
        url: res.url ?? "",
        savedAt: new Date().toISOString(),
      };
      setCurriculoInfo(novoCurriculoInfo);

      setCurriculosHistorico((prev) => [
        novoCurriculoInfo,
        ...prev.filter((c) => c.filename !== novoCurriculoInfo.filename),
      ]);
    } catch (err) {
      console.error("[MapeamentoPage] upload currículo falhou:", err);
      alert("Falha no upload do currículo.");
    } finally {
      e.currentTarget.value = "";
    }
  }

  // Lógica de Download do Último Currículo
  async function handleCvDownload() {
    if (!usuario.mentoradoId) return;
    try {
      await downloadCurriculo(usuario.mentoradoId);
    } catch (err: any) {
      console.error(
        "[MapeamentoPage] download currículo falhou:",
        err?.response?.data ?? err?.message
      );
      alert("Falha ao baixar o currículo.");
    }
  }

  // Lógica de Download de Currículo por Nome
  async function handleCvDownloadByName(filename: string) {
    if (!usuario.mentoradoId) return;
    try {
      await downloadCurriculoByName(usuario.mentoradoId, filename);
    } catch (err: any) {
      console.error(
        "[MapeamentoPage] download currículo por nome falhou:",
        err?.response?.data ?? err?.message
      );
      alert("Falha ao baixar o currículo.");
    }
  }

  async function handleAudioDownload(a: MentoradoAudio) {
    if (!usuario.mentoradoId) return;
    try {
      await downloadMentoradoAudio(usuario.mentoradoId, a);
    } catch (err: any) {
      console.error(
        "[MapeamentoPage] download áudio falhou:",
        err?.response?.data ?? err?.message
      );
      alert("Falha ao baixar o áudio.");
    }
  }

  const hasCv = Boolean(curriculoInfo?.originalName);
  const ultimoAudio = audios?.[0] || null;
  const historicoSemUltimo = curriculosHistorico.slice(1);
  const temHistorico = historicoSemUltimo.length > 0;

  return (
    <div className="mentorados-home">
      <MentoradoHeader />

      <div className="mentorados-content">
        <div className="mentorados-cards">
          {/* ======== CARD DO CURRÍCULO ======== */}
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
                      {curriculoInfo?.originalName}
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
                    <p className="cv-file cv-file--empty">
                      Nenhum arquivo enviado
                    </p>
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

          {/* HISTÓRICO DE CURRÍCULOS */}
          {temHistorico && (
            <div className="mentorados-card mentorados-card--historico">
              <h4 style={{ margin: "0 0 10px 0", color: "#0f172a" }}>
                Histórico de Currículos
              </h4>
              <ul className="historico-list">
                {historicoSemUltimo.map((c) => (
                  <li key={c.filename} className="historico-item">
                    <div className="historico-info">
                      {c.originalName}
                      <span className="historico-date">
                        {new Date(c.savedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCvDownloadByName(c.filename)}
                      className="cv-download"
                    >
                      Baixar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ======== CARD DE ÁUDIO ======== */}
          <div className="mentorados-card mentorados-card--audio">
            <div className="audio-header">
              <h4 style={{ margin: 0, color: "#0f172a" }}>Áudio</h4>
              <button
                className="cv-upload-btn"
                onClick={() => setAudioModalOpen(true)}
                title="Gravar áudio do mentorado"
              >
                Gravar Áudio
              </button>
            </div>

            <div className="audio-content">
              <div className="audio-label">Último Áudio</div>
              {ultimoAudio ? (
                <>
                  <audio
                    src={ultimoAudioSrc ?? ""}
                    controls
                    style={{ width: "100%" }}
                  />
                  <div className="audio-info">
                    <span className="audio-details">
                      {ultimoAudio.filename} •{" "}
                      {(ultimoAudio.size / 1024).toFixed(1)} KB
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
                <div className="audio-empty">
                  Nenhuma gravação encontrada.
                </div>
              )}
            </div>
          </div>

          {/* ======== SEÇÃO DE VAGAS (SEMPRE ABERTA) ======== */}
          <VagasSection pageSize={10} />

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
            setAudios((prev) => [audio, ...prev]);
          }}
        />
      )}
    </div>
  );
}