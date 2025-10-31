import { useState, useEffect } from "react";
import MentoradoHeader from "../../components/layout/MentoradoHeader";
import { getMeuMentorado, iniciarAutomacaoLinkedIn, type IniciarAutomacaoPayload } from "../../lib/api";
import "../../styles/mentorados/candidatura.css";

export default function CandidaturaPage() {
  const [config, setConfig] = useState<IniciarAutomacaoPayload>({
    email: "",
    password: "",
    tipoVaga: "",
    empresasBloqueadas: [],
    maxAplicacoes: 3,
    mentoradoId: undefined,
  });

  const [mentoradoInfo, setMentoradoInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [carregandoMentorado, setCarregandoMentorado] = useState(true);
  const [empresasInput, setEmpresasInput] = useState("");

  // Busca informações do mentorado logado
  useEffect(() => {
    async function carregarMentorado() {
      try {
        setCarregandoMentorado(true);
        const data = await getMeuMentorado();
        
        setMentoradoInfo(data);
        setConfig(prev => ({
          ...prev,
          mentoradoId: data.id,
          tipoVaga: data.cargoObjetivo || "",
          empresasBloqueadas: prev.empresasBloqueadas || []
        }));
      } catch (error) {
        console.error('Erro ao carregar mentorado:', error);
        alert('❌ Erro ao carregar informações do mentorado. Verifique se você está logado.');
      } finally {
        setCarregandoMentorado(false);
      }
    }

    carregarMentorado();
  }, []);

  // Atualiza empresas bloqueadas quando o input muda
  useEffect(() => {
    const empresas = empresasInput
      .split(',')
      .map(empresa => empresa.trim())
      .filter(empresa => empresa.length > 0);
    
    setConfig(prev => ({ 
      ...prev, 
      empresasBloqueadas: empresas 
    }));
  }, [empresasInput]);

  // Função auxiliar para garantir que sempre temos um array
  const getEmpresasBloqueadas = () => {
    return config.empresasBloqueadas || [];
  };

  async function iniciarAutomacao() {
    if (!config.email || !config.password || !config.tipoVaga) {
      alert("Preencha email, senha e tipo de vaga!");
      return;
    }

    if (!mentoradoInfo?.id) {
      alert("❌ Não foi possível identificar seu perfil de mentorado. Recarregue a página.");
      return;
    }

    setLoading(true);
    
    try {
      // Garante que empresasBloqueadas seja um array antes de enviar
      const payload = {
        ...config,
        empresasBloqueadas: getEmpresasBloqueadas()
      };

      const result = await iniciarAutomacaoLinkedIn(payload);
      
      if (result.success) {
        alert(`✅ ${result.message}`);
        
        // Mostra detalhes das aplicações
        if (result.results && result.results.length > 0) {
          const aplicacoesSucesso = result.results.filter((r: any) => r.applied).length;
          
          let detalhes = `Aplicações realizadas: ${aplicacoesSucesso}/${result.results.length}\n\n`;
          
          result.results.forEach((r: any, index: number) => {
            detalhes += `${index + 1}. ${r.jobTitle || 'Vaga'} - ${r.company || 'Empresa'}: ${r.applied ? '✅' : '❌'} ${r.error || ''}\n`;
          });
          
          alert(`Resultados:\n${detalhes}`);
        }
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (err: any) {
      console.error('Erro na automação:', err);
      alert("❌ Erro ao iniciar automação: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  function handleEmpresasChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmpresasInput(e.target.value);
  }

  function handleMaxAplicacoesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    if (value >= 1 && value <= 20) {
      setConfig(prev => ({ ...prev, maxAplicacoes: value }));
    }
  }

  if (carregandoMentorado) {
    return (
      <div className="mentorados-home">
        <div className="mentorados-container">
          <MentoradoHeader />
          <div className="page-content-centered">
            <div className="loading-card">
              <div className="loading-spinner"></div>
              <h3>Carregando suas informações...</h3>
              <p>Por favor, aguarde enquanto carregamos seu perfil.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const empresasBloqueadas = getEmpresasBloqueadas();

  return (
    <div className="mentorados-home">
      <div className="mentorados-container">
        <MentoradoHeader />
        
        <div className="page-content-centered">
          {/* Card de Informações do Mentorado */}
          {mentoradoInfo && (
            <div className="info-card">
              <div className="card-header">
                <h3>📋 Informações do Mentorado</h3>
              </div>
              <div className="card-content">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Cargo:</span>
                    <span className="info-value">{mentoradoInfo.cargoObjetivo}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">ID:</span>
                    <span className="info-value code">{mentoradoInfo.id}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!mentoradoInfo && (
            <div className="warning-card">
              <div className="card-header">
                <h3>⚠️ Aviso Importante</h3>
              </div>
              <div className="card-content">
                <p>
                  Não foi possível carregar suas informações de mentorado. 
                  Verifique se você está logado corretamente e recarregue a página.
                </p>
              </div>
            </div>
          )}

          {/* Card Principal - Automação LinkedIn */}
          <div className="main-card">
            <div className="card-header">
              <h2>🤖 Automação LinkedIn Inteligente</h2>
              <p className="card-subtitle">Aplicação automática para vagas usando candidatura simplificada</p>
            </div>

            <div className="card-content">
              <div className="feature-highlight">
                <div className="feature-icon">🎯</div>
                <div className="feature-text">
                  <strong>Como funciona:</strong> O sistema aplicará automaticamente para vagas do LinkedIn 
                  baseadas no seu perfil e preferências.
                </div>
              </div>

              {/* Formulário de Configuração */}
              <div className="form-section">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Email do LinkedIn *</label>
                    <input
                      type="email"
                      value={config.email}
                      onChange={(e) => setConfig(s => ({ ...s, email: e.target.value }))}
                      className="form-input"
                      placeholder="seu.email@exemplo.com"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Senha do LinkedIn *</label>
                    <input
                      type="password"
                      value={config.password}
                      onChange={(e) => setConfig(s => ({ ...s, password: e.target.value }))}
                      className="form-input"
                      placeholder="Sua senha"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tipo de Vaga *</label>
                    <input
                      value={config.tipoVaga}
                      onChange={(e) => setConfig(s => ({ ...s, tipoVaga: e.target.value }))}
                      className="form-input"
                      placeholder="Ex: Desenvolvedor Frontend, Analista de Dados"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quantidade de Candidaturas</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.maxAplicacoes}
                      onChange={handleMaxAplicacoesChange}
                      className="form-input"
                    />
                    <small className="form-hint">Máximo de 20 candidaturas por execução</small>
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">🚫 Empresas Bloqueadas</label>
                    <input
                      placeholder="Ex: Consultoria X, Empresa Y, Tech Corp"
                      value={empresasInput}
                      onChange={handleEmpresasChange}
                      className="form-input"
                    />
                    <small className="form-hint">
                      {empresasBloqueadas.length > 0 
                        ? `${empresasBloqueadas.length} empresa(s) bloqueada(s): ${empresasBloqueadas.join(', ')}`
                        : 'Digite os nomes das empresas separados por vírgula'
                      }
                    </small>
                  </div>
                </div>

                <div className="actions-section">
                  <button 
                    onClick={iniciarAutomacao}
                    disabled={loading || !config.email || !config.password || !config.tipoVaga || !mentoradoInfo}
                    className="automation-button"
                  >
                    {loading ? (
                      <>
                        <div className="button-spinner"></div>
                        EXECUTANDO AUTOMAÇÃO...
                      </>
                    ) : (
                      <>
                        🚀 INICIAR AUTOMAÇÃO INTELIGENTE
                      </>
                    )}
                  </button>

                  <div className="automation-warning">
                    <div className="warning-icon">⚠️</div>
                    <div className="warning-text">
                      O navegador abrirá automaticamente e você verá todo o processo acontecer em tempo real!
                    </div>
                  </div>
                </div>

                {/* Resumo da Configuração */}
                {config.email && config.tipoVaga && (
                  <div className="config-summary">
                    <h4>📝 Resumo da Configuração</h4>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span className="summary-label">Email:</span>
                        <span className="summary-value">{config.email}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Tipo de Vaga:</span>
                        <span className="summary-value">{config.tipoVaga}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Candidaturas:</span>
                        <span className="summary-value">{config.maxAplicacoes}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Empresas Bloqueadas:</span>
                        <span className="summary-value">
                          {empresasBloqueadas.length > 0 ? empresasBloqueadas.join(', ') : 'Nenhuma'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}