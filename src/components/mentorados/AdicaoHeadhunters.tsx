// frontend/src/components/ssi/AdicaoHeadhunters.tsx

const HEADHUNTERS: Array<{ nome: string; contato?: string }> = [
  // Preencha com base na sua lista (nome do headhunter/empresa e link do perfil)
  // Ex.: { nome: "Empresa A — Headhunter 1", contato: "linkedin.com/in/..." },
];

export default function AdicaoHeadhunters() {
  return (
    <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 6px 16px rgba(0,0,0,0.12)", padding:16, marginTop:20 }}>
      <h3 style={{ marginTop:0 }}>Adição de Headhunters</h3>
      {HEADHUNTERS.length === 0 ? (
        <div style={{ color:"#64748b", fontSize:13 }}>Preencha a lista com base na planilha.</div>
      ) : (
        <ul style={{ margin:0, paddingLeft:18, lineHeight:1.7 }}>
          {HEADHUNTERS.map((h, i) => (
            <li key={i}>
              <strong>{h.nome}</strong>
              {h.contato ? (
                <> — <a href={`https://${h.contato.replace(/^https?:\/\//i, "")}`} target="_blank" rel="noreferrer">{h.contato}</a></>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
