// frontend/src/components/ssi/CronogramaAtividades.tsx

const ATIVIDADES: Array<{ semana: string; atividade: string; responsavel: string; status: string }> = [
  // Indicadores de Desempenho LinkedIn
  { semana: "", atividade: "SSI no seu Setor", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "SSI na sua Rede", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Social Selling Index", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Estabelecer sua Marca Profissional", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Localizar as Pessoas Certas", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Interagir oferecendo Insights", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Cultivar Relacionamentos", responsavel: "Você", status: "Pendente" },

  // Alcance & Perfil (LinkedIn)
  { semana: "", atividade: "Impressões da Publicação", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Visualizações do Perfil", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Ocorrências em Resultado de Pesquisa", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Taxa de Recrutadores que viram seu perfil", responsavel: "Você", status: "Pendente" },

  // Candidaturas & RH
  { semana: "", atividade: "Quantidade de Candidaturas Simplificadas", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Quantidade de Candidaturas Visualizadas", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Quantidade de Currículos Baixados", responsavel: "Você", status: "Pendente" },

  // Conteúdo & Interações
  { semana: "", atividade: "Publicações na Semana", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Interações via comentários", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Contribuições em Artigos Colaborativos", responsavel: "Você", status: "Pendente" },

  // Networking
  { semana: "", atividade: "Pedidos de Conexão com Headhunters", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Pedidos de Conexão com Decisores", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Mensagens para Recrutadores", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Mensagens para Networking", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Cafés Agendados", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Cafés Tomados", responsavel: "Você", status: "Pendente" },

  // Processos
  { semana: "", atividade: "Entrevistas Realizadas", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Entrevistas em Fase Final", responsavel: "Você", status: "Pendente" },
  { semana: "", atividade: "Cartas Ofertas Recebidas", responsavel: "Você", status: "Pendente" },
];

export default function CronogramaAtividades() {
  return (
    <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 6px 16px rgba(0,0,0,0.12)", padding:16, marginTop:20 }}>
      <h3 style={{ marginTop:0 }}>Cronograma de Atividades</h3>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ borderBottom:"1px solid #eee" }}>
            <th style={{ textAlign:"left", padding:"8px 6px" }}>Semana</th>
            <th style={{ textAlign:"left", padding:"8px 6px" }}>Atividade</th>
            <th style={{ textAlign:"left", padding:"8px 6px" }}>Responsável</th>
            <th style={{ textAlign:"left", padding:"8px 6px" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {ATIVIDADES.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding:"10px 6px", color:"#64748b", fontSize:13 }}>
                Preencha as atividades com base na planilha.
              </td>
            </tr>
          ) : (
            ATIVIDADES.map((a, i) => (
              <tr key={i} style={{ borderBottom:"1px solid #f2f2f2" }}>
                <td style={{ padding:"8px 6px" }}>{a.semana || "—"}</td>
                <td style={{ padding:"8px 6px" }}>{a.atividade}</td>
                <td style={{ padding:"8px 6px" }}>{a.responsavel}</td>
                <td style={{ padding:"8px 6px" }}>{a.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
