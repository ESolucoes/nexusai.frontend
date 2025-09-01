import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  mentoradoId: string;
  onSaved?: (audio: { url: string; filename: string }) => void;
  onError?: (msg: string) => void;
  uploadFn: (mentoradoId: string, file: Blob | File) => Promise<{ ok: boolean; audio: { url: string; filename: string } }>;
};

export default function AudioRecorderModal({ open, onClose, mentoradoId, onSaved, onError, uploadFn }: Props) {
  const [recording, setRecording] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [permissionErr, setPermissionErr] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!open) {
      cleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function cleanup() {
    try {
      mediaRecRef.current?.stop();
    } catch {}
    mediaRecRef.current = null;
    chunksRef.current = [];
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setBlob(null);
    setRecording(false);
    setPermissionErr(null);
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(b);
        const url = URL.createObjectURL(b);
        setBlobUrl(url);
      };
      mediaRecRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (err: any) {
      setPermissionErr("Permissão de microfone negada ou indisponível.");
      onError?.(err?.message || "Não foi possível acessar o microfone.");
    }
  }

  function stop() {
    try {
      mediaRecRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      setRecording(false);
    } catch (err: any) {
      onError?.(err?.message || "Falha ao parar a gravação.");
    }
  }

  async function save() {
    if (!blob) return onError?.("Nenhuma gravação para salvar.");
    try {
      const { ok, audio } = await uploadFn(mentoradoId, blob);
      if (ok) {
        onSaved?.(audio);
        onClose();
        cleanup();
      }
    } catch (err: any) {
      onError?.(err?.message || "Falha ao enviar gravação.");
    }
  }

  if (!open) return null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>Gravar áudio do mentorado</h3>
        <p style={{ marginTop: 8, color: "#666" }}>
          {permissionErr ?? "Clique em Permitir no navegador para acessar o microfone."}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0" }}>
          {!recording && (
            <button onClick={start} style={styles.btnPrimary}>Iniciar Gravação</button>
          )}
          {recording && (
            <button onClick={stop} style={styles.btnDanger}>Parar</button>
          )}
          {blobUrl && !recording && (
            <button onClick={save} style={styles.btnPrimary}>Salvar</button>
          )}
          <button onClick={() => { cleanup(); onClose(); }} style={styles.btnGhost}>Fechar</button>
        </div>

        <div>
          {blobUrl ? (
            <audio src={blobUrl} controls style={{ width: "100%" }} />
          ) : (
            <div style={{ fontSize: 13, color: "#999" }}>Sem prévia ainda…</div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
  },
  modal: {
    width: 520, background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 12px 32px rgba(0,0,0,0.2)"
  },
  btnPrimary: { padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, background: "#2563eb", color: "#fff" },
  btnDanger:  { padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, background: "#dc2626", color: "#fff" },
  btnGhost:   { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", fontWeight: 600, background: "#fff", color: "#333" },
};
