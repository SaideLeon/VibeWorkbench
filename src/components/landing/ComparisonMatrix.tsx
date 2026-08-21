import { motion } from 'motion/react';
import { 
  Check, 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const ComparisonMatrix = ({ onAuditClick }: { onAuditClick: () => void }) => {
  const rows = [
    {
      capability: 'Autorização & Controle de Paywall',
      vibeCoding: 'Verificado no front-end / LocalStorage (Bypass no F12)',
      workbench: 'Autorização criptográfica 100% no servidor (Imune a F12)',
      vulnerable: true,
    },
    {
      capability: 'Gestão de Chaves de API (OpenAI / Stripe)',
      vibeCoding: 'Embutidas no JavaScript público (Sources Ctrl+F "key")',
      workbench: 'Cofre isolado em variáveis de ambiente com Serverless Proxies',
      vulnerable: true,
    },
    {
      capability: 'Proteção de Autenticação & OTP',
      vibeCoding: 'Acoplamento com app_id público (O Caso Base44)',
      workbench: 'Rate limiting rigoroso, CSRF tokens e validação com tenant ID',
      vulnerable: true,
    },
    {
      capability: 'Banco de Dados & Row Level Security (RLS)',
      vibeCoding: 'Políticas ausentes ou "USING (true)" vazando tabelas inteiras',
      workbench: 'Políticas RLS restritivas por padrão (auth.uid() = user_id)',
      vulnerable: true,
    },
    {
      capability: 'Comandos Destrutivos de Agentes de IA',
      vibeCoding: 'Apenas prompts textuais (Agente pode alucinar e apagar banco)',
      workbench: 'Travas físicas de infraestrutura + Human-in-the-Loop antes de comandos',
      vulnerable: true,
    },
    {
      capability: 'Execução de Scripts & Sandboxing',
      vibeCoding: 'Executa código na máquina local sem isolamento (Risco de RCE)',
      workbench: 'Ambiente conteinerizado efêmero sem acesso ao sistema do usuário',
      vulnerable: true,
    },
    {
      capability: 'Correção de Código & Entregáveis',
      vibeCoding: 'Respostas textuais genéricas que esquecem dependências',
      workbench: 'Relatório estruturado com Score 0-100 e arquivo .patch pronto',
      vulnerable: true,
    },
    {
      capability: 'Catálogo de Regras Validado',
      vibeCoding: 'Alucinação livre sem padrão de compliance',
      workbench: '36 Regras estritas (R01–R25 & CTF-R01–R11 com pesos severos)',
      vulnerable: true,
    }
  ];

  return (
    <section className="py-24 bg-[#0a0a0d] border-b border-white/10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            VibeCoding Tradicional vs. <span className="text-indigo-400">Mitigar IA</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Entenda por que confiar no código gerado por IA sem uma camada de auditoria e infraestrutura especializada coloca seu negócio e seus clientes em risco.
          </p>
        </div>

        {/* Matrix Table */}
        <div className="bg-[#121216] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-w-5xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-white/10 bg-[#16161c]">
                  <th className="p-4 sm:p-5 text-xs font-bold uppercase tracking-wider text-gray-400 w-1/3">
                    Critério de Segurança
                  </th>
                  <th className="p-4 sm:p-5 text-xs font-bold uppercase tracking-wider text-red-400 w-1/3 bg-red-500/5">
                    ❌ VibeCoding Sem Auditoria
                  </th>
                  <th className="p-4 sm:p-5 text-xs font-bold uppercase tracking-wider text-emerald-400 w-1/3 bg-emerald-500/5">
                    🛡️ Mitigar IA Blindado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
                {rows.map((r, idx) => (
                  <tr key={r.capability} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 sm:p-5 font-semibold text-gray-200">
                      {r.capability}
                    </td>
                    
                    <td className="p-4 sm:p-5 text-red-300/90 bg-red-500/[0.02]">
                      <div className="flex items-start gap-2">
                        <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span>{r.vibeCoding}</span>
                      </div>
                    </td>

                    <td className="p-4 sm:p-5 text-emerald-300/95 bg-emerald-500/[0.02] font-medium">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{r.workbench}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-[#16161c] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-gray-400 text-center sm:text-left">
              Não corra o risco de ter dados vazados como no caso TiaApp ou Base44.
            </span>
            <button
              onClick={onAuditClick}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Auditar Meu Código Agora</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
