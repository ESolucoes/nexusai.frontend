// frontend/src/components/ssi/ConexoesPrimeiroNivel.tsx

const CONEXOES: Array<{ alvo: string; metaSemanal?: number | string; obs?: string }> = [
  { alvo: "Pedidos de Conexão com Headhunters", metaSemanal: 50 },
  { alvo: "Pedidos de Conexão com Decisores",   metaSemanal: 50 },
  { alvo: "Mensagens para Recrutadores",        metaSemanal: 10 },
  { alvo: "Mensagens para Networking",          metaSemanal: 10 },
  { alvo: "Cafés Agendados",                    metaSemanal: 2 },
  { alvo: "Cafés Tomados",                      metaSemanal: 1 },
];

export default function ConexoesPrimeiroNivel() {
  return (
    <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 6px 16px rgba(0,0,0,0.12)", padding:16, marginTop:20 }}>
      <h3 style={{ marginTop:0 }}>Conexões em Primeiro Nível</h3>
      {CONEXOES.length === 0 ? (
        <div style={{ color:"#64748b", fontSize:13 }}>Preencha as metas/listas com base na planilha.</div>
      ) : (
        <ul style={{ margin:0, paddingLeft:18, lineHeight:1.7 }}>
          {CONEXOES.map((c, i) => (
            <li key={i}>
              <strong>{c.alvo}</strong>
              {c.metaSemanal ? <> — Meta semanal: {c.metaSemanal}</> : null}
              {c.obs ? <> — {c.obs}</> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
