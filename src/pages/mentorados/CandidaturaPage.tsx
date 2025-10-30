// frontend/src/pages/mentorados/CandidaturaPage.tsx
import { useState } from "react";
import MentoradoHeader from "../../components/layout/MentoradoHeader";
import "../../styles/mentorados/candidatura.css";

interface ConfigAutomacao {
  email: string;
  password: string;
  tipoVaga: string;
  empresasBloqueadas: string[];
  pretensaoClt?: number;
  pretensaoPj?: number;
  maxAplicacoes: number;
}

export default function CandidaturaPage() {
  const [config, setConfig] = useState<ConfigAutomacao>({
    email: "",
    password: "",
    tipoVaga: "",
    empresasBloqueadas: [],
    pretensaoClt: undefined,
    pretensaoPj: undefined,
    maxAplicacoes: 3,
  });

  const [loading, setLoading] = useState(false);

  async function iniciarAutomacao() {
    if (!config.email || !config.password || !config.tipoVaga) {
      alert("Preencha email, senha e tipo de vaga!");
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`http://localhost:3000/mentorados-candidatura/iniciar-automacao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (err: any) {
      alert("❌ Erro ao iniciar automação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mentorados-home">
      <div style={{ maxWidth: 800, margin: "20px auto", padding: 16 }}>
        <MentoradoHeader />

        <div className="mentorados-card">
          <h3 style={{ marginTop: 0, textAlign: "center" }}>Automação LinkedIn</h3>

          {/* Formulário DIRETO */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              placeholder="Email do LinkedIn"
              type="email"
              value={config.email}
              onChange={(e) => setConfig(s => ({ ...s, email: e.target.value }))}
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
            />

            <input
              placeholder="Senha do LinkedIn"
              type="password"
              value={config.password}
              onChange={(e) => setConfig(s => ({ ...s, password: e.target.value }))}
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
            />

            <input
              placeholder="Tipo de Vaga (ex: Desenvolvedor)"
              value={config.tipoVaga}
              onChange={(e) => setConfig(s => ({ ...s, tipoVaga: e.target.value }))}
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
            />

            <input
              placeholder="Empresas bloqueadas (vírgula)"
              value={config.empresasBloqueadas.join(",")}
              onChange={(e) =>
                setConfig(s => ({
                  ...s,
                  empresasBloqueadas: e.target.value.split(",").map(v => v.trim()).filter(Boolean),
                }))
              }
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input
                placeholder="Pretensão CLT"
                type="number"
                value={config.pretensaoClt || ""}
                onChange={(e) => setConfig(s => ({ ...s, pretensaoClt: e.target.value ? Number(e.target.value) : undefined }))}
                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
              />

              <input
                placeholder="Pretensão PJ"
                type="number"
                value={config.pretensaoPj || ""}
                onChange={(e) => setConfig(s => ({ ...s, pretensaoPj: e.target.value ? Number(e.target.value) : undefined }))}
                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
              />
            </div>

            <input
              placeholder="Número de candidaturas"
              type="number"
              value={config.maxAplicacoes}
              onChange={(e) => setConfig(s => ({ ...s, maxAplicacoes: Number(e.target.value) || 3 }))}
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>

          {/* Botão ÚNICO */}
          <div style={{ marginTop: 20 }}>
            <button 
              onClick={iniciarAutomacao}
              disabled={loading || !config.email || !config.password || !config.tipoVaga}
              style={{ 
                width: '100%',
                padding: '15px',
                backgroundColor: (!config.email || !config.password || !config.tipoVaga) ? '#6c757d' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: (loading || !config.email || !config.password || !config.tipoVaga) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? "🎬 EXECUTANDO..." : "🚀 INICIAR AUTOMAÇÃO COMPLETA"}
            </button>
          </div>

          <div style={{ marginTop: 15, fontSize: 14, color: '#666', textAlign: 'center' }}>
            ⚠️ O navegador abrirá e você verá tudo acontecer automaticamente!
          </div>
        </div>
      </div>
    </div>
  );
}