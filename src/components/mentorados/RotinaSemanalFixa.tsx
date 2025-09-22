// frontend/src/components/ssi/RotinaSemanalFixa.tsx

const ITENS: Array<{ titulo: string; frequencia: string; obs?: string }> = [
  { titulo: "Compartilhar conteúdos relevantes para o setor.", frequencia: "Semanal" },
  { titulo: "Interagir com profissionais de destaque e grupos.", frequencia: "Semanal" },
  { titulo: "Interagir mais frequentemente com conexões através de comentários e mensagens.", frequencia: "Semanal" },
  { titulo: "Compartilhar atualizações profissionais.", frequencia: "Semanal" },
  { titulo: "Atualizar o perfil com as informações do mapeamento.", frequencia: "Semanal" },
  { titulo: "Participar de discussões em grupos e compartilhar artigos.", frequencia: "Semanal" },
  { titulo: "Criar e compartilhar conteúdo original que demonstre expertise.", frequencia: "Semanal" },
  { titulo: "Personalizar o perfil com informações relevantes para as vagas.", frequencia: "Semanal" },
  { titulo: "Pesquisar e se conectar com decisores e influenciadores do setor.", frequencia: "Semanal" },
  { titulo: "Utilizar filtros avançados para encontrar contatos relevantes.", frequencia: "Semanal" },
  { titulo: "Compartilhar insights e comentários em posts de profissionais da área.", frequencia: "Semanal" },
  { titulo: "Publicar conteúdo relevante e de valor para a rede.", frequencia: "Semanal" },
  { titulo: "Manter contato frequente com conexões estratégicas.", frequencia: "Semanal" },
  { titulo: "Enviar mensagens de follow-up para contatos importantes.", frequencia: "Semanal" },
  { titulo: "Aumentar a frequência de publicações semanais.", frequencia: "Semanal" },
  { titulo: "Marcar pessoas relevantes para ampliar o alcance.", frequencia: "Semanal" },
  { titulo: "Otimizar o perfil com base nas vagas e oportunidades desejadas.", frequencia: "Semanal" },
  { titulo: "Interagir mais com a rede para aumentar a visibilidade.", frequencia: "Semanal" },
  { titulo: "Atualizar o perfil com informações das vagas e habilidades específicas.", frequencia: "Semanal" },
  { titulo: "Participar de discussões em grupos de interesse.", frequencia: "Semanal" },
  { titulo: "Ajustar o perfil para refletir as qualificações desejadas.", frequencia: "Semanal" },
  { titulo: "Adicionar detalhes das realizações profissionais e objetivos.", frequencia: "Semanal" },
  { titulo: "Interagir com recrutadores e participar de eventos online.", frequencia: "Semanal" },
  { titulo: "Solicitar recomendações com pessoas com quem trabalhou.", frequencia: "Semanal" },
  { titulo: "Utilizar a funcionalidade de candidatura simplificada em vagas compatíveis.", frequencia: "Semanal" },
  { titulo: "Personalizar o perfil para as oportunidades desejadas.", frequencia: "Semanal" },
  { titulo: "Acompanhar o status das candidaturas e realizar follow-up.", frequencia: "Semanal" },
  { titulo: "Ajustar o perfil com palavras-chave específicas para atrair recrutadores.", frequencia: "Semanal" },
  { titulo: "Adicionar um resumo atrativo e resultados mensuráveis no currículo.", frequencia: "Semanal" },
  { titulo: "Manter o CAC atualizado e alinhado com o perfil.", frequencia: "Semanal" },
  { titulo: "Enviar mensagens personalizadas para contatos de RH e acompanhar feedbacks.", frequencia: "Semanal" },
  { titulo: "Agendar reuniões para discutir oportunidades e feedbacks.", frequencia: "Semanal" },
  { titulo: "Definir uma agenda para postagens regulares.", frequencia: "Semanal" },
  { titulo: "Participar activamente em discussões e comentar em posts de conexões.", frequencia: "Semanal" },
  { titulo: "Comentar em postagens de influenciadores e conexões.", frequencia: "Semanal" },
  { titulo: "Fazer perguntas e iniciar discussões nos comentários.", frequencia: "Semanal" },
  { titulo: "Participar de grupos e discutir tendências e tópicos relevantes.", frequencia: "Semanal" },
  { titulo: "Compartilhar conhecimento e experiências profissionais.", frequencia: "Semanal" },
  { titulo: "Enviar solicitações de conexão com uma mensagem personalizada.", frequencia: "Semanal" },
  { titulo: "Participar de grupos onde headhunters estão ativos.", frequencia: "Semanal" },
  { titulo: "Enviar convites personalizados destacando um interesse comum.", frequencia: "Semanal" },
  { titulo: "Acompanhar postagens e interagir com os decisores.", frequencia: "Semanal" },
  { titulo: "Personalizar as mensagens para recrutadores com base em vagas específicas.", frequencia: "Semanal" },
  { titulo: "Realizar follow-up e buscar feedbacks.", frequencia: "Semanal" },
  { titulo: "Compartilhar atualizações e ideias com a rede.", frequencia: "Semanal" },
  { titulo: "Enviar mensagens para novos contatos e acompanhar o progresso.", frequencia: "Semanal" },
  { titulo: "Propor reuniões presenciais ou virtuais com contatos estratégicos.", frequencia: "Semanal" },
  { titulo: "Definir um tema ou objetivo para o encontro.", frequencia: "Semanal" },
  { titulo: "Agendar encontros presenciais ou virtuais com contatos estratégicos.", frequencia: "Semanal" },
  { titulo: "Propor temas de discussão que agreguem valor.", frequencia: "Semanal" },
  { titulo: "Acompanhar feedbacks de entrevistas anteriores.", frequencia: "Semanal" },
  { titulo: "Ajustar respostas e preparar-se para questões complexas.", frequencia: "Semanal" },
  { titulo: "Solicitar feedback ao final das entrevistas para entender pontos a melhorar.", frequencia: "Semanal" },
  { titulo: "Reforçar as qualificações e demonstrar interesse.", frequencia: "Semanal" },
  { titulo: "Enviar follow-up após entrevistas para reforçar interesse.", frequencia: "Semanal" },
  { titulo: "Negociar com base em múltiplas ofertas, se disponíveis.", frequencia: "Semanal" },
];

export default function RotinaSemanalFixa() {
  return (
    <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 6px 16px rgba(0,0,0,0.12)", padding:16, marginTop:20 }}>
      <h3 style={{ marginTop:0 }}>Rotina Semanal Fixa</h3>
      {ITENS.length === 0 ? (
        <div style={{ color:"#64748b", fontSize:13 }}>Preencha os itens com base na planilha.</div>
      ) : (
        <ul style={{ margin:0, paddingLeft:18, lineHeight:1.7 }}>
          {ITENS.map((i, idx) => (
            <li key={idx}>
              <strong>{i.titulo}</strong> — <span>{i.frequencia}</span>
              {i.obs ? <> — {i.obs}</> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
