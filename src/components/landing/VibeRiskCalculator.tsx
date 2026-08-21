import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  CheckSquare, 
  Square,
  Sparkles,
  Zap,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  category: string;
  text: string;
  weight: number;
  breachLayerId: number;
  breachName: string;
  explanation: string;
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    category: 'Chaves & Segredos',
    text: 'Colei minha chave da OpenAI / Gemini / Stripe no chat da IA ou no código-fonte.',
    weight: 25,
    breachLayerId: 2,
    breachName: 'Camada 2: Chaves de API Expostas',
    explanation: 'Sua chave de API mestra provavelmente está no bundle JavaScript público acessível no DevTools.'
  },
  {
    id: 'q2',
    category: 'Autorização',
    text: 'O controle de plano pago/grátis é verificado apenas no front-end ou via LocalStorage.',
    weight: 20,
    breachLayerId: 1,
    breachName: 'Camada 1: Bypass de Paywall no Cliente',
    explanation: 'Qualquer pessoa com F12 pode alterar os valores e acessar recursos pagos sem assinar.'
  },
  {
    id: 'q3',
    category: 'Banco de Dados',
    text: 'Uso Supabase ou PostgreSQL sem ter configurado políticas manuais de RLS (Row Level Security).',
    weight: 25,
    breachLayerId: 4,
    breachName: 'Camada 4: Banco Inteiro Aberto via anon_key',
    explanation: 'Com 15 linhas de Python ou sem headers, qualquer visitante pode baixar a tabela de usuários.'
  },
  {
    id: 'q4',
    category: 'Autenticação',
    text: 'Uso um identificador público (app_id ou URL) para criar usuários ou disparar OTPs sem login.',
    weight: 15,
    breachLayerId: 3,
    breachName: 'Camada 3: Falha de Autenticação / Bypass OTP',
    explanation: 'Invasores podem forjar registros automatizados e obter contas verificadas em sistemas privados.'
  },
  {
    id: 'q5',
    category: 'Agentes de IA',
    text: 'Uso agentes de IA que executam comandos no banco ou no terminal apenas com instruções de texto.',
    weight: 15,
    breachLayerId: 5,
    breachName: 'Camada 5: Alucinação de Agente / Sem Fechadura',
    explanation: 'Prompts em texto não impedem o agente de apagar bancos de dados em momentos de alucinação.'
  },
  {
    id: 'q6',
    category: 'Governança & Shadow',
    text: 'Criei o aplicativo conectando bancos ou CRMs da minha empresa sem revisão da equipe de TI.',
    weight: 20,
    breachLayerId: 7,
    breachName: 'Camada 7: Shadow Builder Corporativo',
    explanation: 'Dados internos podem estar indexados e visíveis em pesquisas simples no Google ou Bing.'
  }
];

export const VibeRiskCalculator = ({ onScanRepo }: { onScanRepo: () => void }) => {
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, boolean>>({
    q1: true,
    q2: true,
    q3: true,
  });

  const toggleQuestion = (id: string) => {
    setSelectedQuestions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleReset = () => {
    setSelectedQuestions({});
  };

  const { score, riskLevel, activeBreaches } = useMemo(() => {
    let totalRiskPoints = 0;
    const breaches: Question[] = [];

    QUESTIONS.forEach(q => {
      if (selectedQuestions[q.id]) {
        totalRiskPoints += q.weight;
        breaches.push(q);
      }
    });

    // Score de Segurança (100 = seguro, 0 = extremamente vulnerável)
    const securityScore = Math.max(0, 100 - totalRiskPoints);

    let level: {
      label: string;
      color: string;
      bg: string;
      border: string;
      description: string;
    };

    if (securityScore < 50) {
      level = {
        label: '🔴 RISCO CRÍTICO DE VAZAMENTO',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        description: 'Seu aplicativo está com brechas gravíssimas ativas. Invasores ou ferramentas automatizadas podem extrair credenciais, dados de usuários ou bypassar pagamentos em minutos.'
      };
    } else if (securityScore < 80) {
      level = {
        label: '🟠 RISCO ALTO',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        description: 'Existem vulnerabilidades estruturais no seu fluxo de autorização ou gestão de segredos que precisam de blindagem antes do lançamento.'
      };
    } else {
      level = {
        label: '🟢 PROTEÇÃO RAZOÁVEL',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        description: 'Você segue boas práticas essenciais. Recomendamos rodar a auditoria completa para validar regras de injection, rate limit e integridade de transações.'
      };
    }

    return { score: securityScore, riskLevel: level, activeBreaches: breaches };
  }, [selectedQuestions]);

  return (
    <section id="calculadora-risco" className="py-24 bg-[#0a0a0d] border-b border-white/10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Calculadora de Risco do Seu <span className="text-amber-400">VibeCode</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Selecione as características do seu aplicativo para calcular a probabilidade de vazamento de dados e descobrir quais das 7 brechas estão ativas no seu projeto.
          </p>
        </div>

        {/* 2-Column Calculator Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
          
          {/* Left Column: Interactive Checkbox Questions (7 Cols) */}
          <div className="lg:col-span-7 bg-[#121216] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Marque o que se aplica ao seu projeto:
              </span>
              <button
                onClick={handleReset}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar opções
              </button>
            </div>

            <div className="space-y-3">
              {QUESTIONS.map(q => {
                const isChecked = !!selectedQuestions[q.id];

                return (
                  <div
                    key={q.id}
                    onClick={() => toggleQuestion(q.id)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none",
                      isChecked 
                        ? "bg-red-500/10 border-red-500/30 text-white" 
                        : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/[0.07] hover:border-white/10"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-red-400" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-gray-300">
                          {q.category}
                        </span>
                        {isChecked && (
                          <span className="text-[10px] font-bold text-red-400">
                            +{q.weight}% de risco
                          </span>
                        )}
                      </div>
                      <p className={cn("text-xs sm:text-sm font-medium leading-snug", isChecked ? "text-gray-100" : "text-gray-300")}>
                        {q.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Score & Report (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Score Box */}
            <div className={cn(
              "border rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl transition-all",
              riskLevel.bg,
              riskLevel.border
            )}>
              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Índice de Segurança do Código
                </span>
                
                <div className="flex items-baseline justify-center gap-2">
                  <span className={cn("text-6xl font-black tracking-tight", riskLevel.color)}>
                    {score}
                  </span>
                  <span className="text-xl text-gray-500 font-bold">/100</span>
                </div>

                <div className={cn("text-xs font-extrabold tracking-wide uppercase px-3 py-1 rounded-full inline-block mt-2 border", riskLevel.bg, riskLevel.border, riskLevel.color)}>
                  {riskLevel.label}
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed text-center">
                {riskLevel.description}
              </p>

              {/* Active Breaches List */}
              {activeBreaches.length > 0 && (
                <div className="pt-4 border-t border-white/10 space-y-2.5">
                  <div className="text-xs font-bold text-gray-200">
                    Brechas Ativas Identificadas ({activeBreaches.length}):
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {activeBreaches.map(b => (
                      <div key={b.id} className="bg-black/30 p-2.5 rounded-lg text-xs space-y-0.5 border border-white/5">
                        <span className="font-bold text-red-300 block">{b.breachName}</span>
                        <span className="text-[11px] text-gray-400">{b.explanation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA to Scan */}
              <button
                onClick={onScanRepo}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.02] cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Auditar Repositório & Gerar Correção</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#121216] border border-white/10 rounded-xl p-4 text-xs text-gray-400 text-center">
              🛡️ O Mitigar IA corrige automaticamente essas falhas através de <strong>Blueprints e arquivos .patch</strong> prontos para o Git.
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
