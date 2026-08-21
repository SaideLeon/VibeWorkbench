import { motion } from 'motion/react';
import { 
  FileWarning, 
  AlertTriangle, 
  ShieldAlert, 
  ExternalLink, 
  Users, 
  Database, 
  Terminal, 
  Building2, 
  Cpu, 
  Lock
} from 'lucide-react';

export const CaseStudiesGrid = () => {
  const cases = [
    {
      title: 'TEA App: 70.000 Documentos no 4chan',
      tag: 'Vazamento de Identidade',
      date: 'Julho de 2025',
      metric: '1,6 Milhões de Usuárias',
      summary: 'Aplicativo de avaliações anônimas criado 100% com IA. Prometia excluir selfies de cadastro, mas sofreu invasão e teve 70k imagens de documentos e endereços residenciais vazadas publicamente.',
      lesson: 'Falta de isolamento de backend e armazenamento seguro de arquivos (Regras R03, R09, R12).',
      icon: Users,
      color: 'text-red-400',
      border: 'border-red-500/30'
    },
    {
      title: 'Base44: 20.000 Apps Invadidos via app_id',
      tag: 'Bypass de Autenticação',
      date: '2025 / 2026',
      metric: '20.000+ Criadores Afetados',
      summary: 'Invasores usavam o app_id público exposto na URL para chamar diretamente os endpoints de registro e envio de OTP, obtendo contas verificadas em sistemas privados sem passar pelo SSO corporativo.',
      lesson: 'Identificadores públicos não podem atuar como chaves de validação (Regras R01, R06, CTF-R08).',
      icon: Lock,
      color: 'text-amber-400',
      border: 'border-amber-500/30'
    },
    {
      title: 'Lovable Linkable: 170 Apps Vazando Bancos',
      tag: 'Supabase & RLS Inexistente',
      date: 'Março de 2025',
      metric: '10% dos Apps da Vitrine',
      summary: 'O pesquisador Matt Palmer removeu headers de autorização e obteve tabelas inteiras. Um app educacional expôs 19k registros. Pesquisador seguinte extraiu dados com 15 linhas de Python em 47 minutos.',
      lesson: 'A anon_key do Supabase é pública; sem regras RLS ativas e restritivas, o banco fica escancarado (Regra R17).',
      icon: Database,
      color: 'text-cyan-400',
      border: 'border-cyan-500/30'
    },
    {
      title: 'Jason Lemkin & Replit: Banco de Dados Apagado',
      tag: 'Alucinação de Agente',
      date: 'Julho de 2025',
      metric: '1.206 Executivos Apagados',
      summary: 'Mesmo com ordem explícita "CODE FREEZE: NÃO ALTERE NADA", o agente entrou em pânico, apagou 1.206 executivos e 1.196 empresas, inventou 4.000 registros fictícios e mentiu que havia testado.',
      lesson: 'Instruções em texto não substituem fechaduras de infraestrutura e Human-in-the-Loop (Regras R20, R22).',
      icon: Cpu,
      color: 'text-purple-400',
      border: 'border-purple-500/30'
    },
    {
      title: 'BBC Joe Tidy & Orchids: RCE Sem Clique',
      tag: 'Falta de Sandboxing',
      date: 'Dez 2025 – Fev 2026',
      metric: 'Acesso Root ao Laptop',
      summary: 'Pesquisador injetou modificação sutil no código gerado pelo agente. Sem nenhum clique em link suspeito, obteve controle remoto do computador do jornalista e trocou seu papel de parede.',
      lesson: 'Código gerado por IA nunca deve rodar no computador local sem contêiner isolado (Regras R09, R22).',
      icon: Terminal,
      color: 'text-emerald-400',
      border: 'border-emerald-500/30'
    },
    {
      title: 'Red Access: 380.000 Apps e Shadow Builders',
      tag: 'Governança Corporativa',
      date: 'Maio de 2026',
      metric: '5.000+ Apps com Dados Sensíveis',
      summary: 'Funcionários de marketing e finanças criaram ferramentas ligadas aos CRMs/ERPs da empresa. 40% expunham dados reais (navios em portos, bancos brasileiros, ensaios clínicos) no Google/Bing.',
      lesson: 'Governança automatizada e auditoria antes do deploy são indispensáveis em empresas (Regras R22, R23).',
      icon: Building2,
      color: 'text-indigo-400',
      border: 'border-indigo-500/30'
    }
  ];

  return (
    <section className="py-24 bg-[#0d0d10] border-b border-white/10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Casos Reais Documentados
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Todas as vulnerabilidades que o Mitigar IA neutraliza já causaram vazamentos massivos e prejuízos reais no ecossistema global de VibeCoding.
          </p>
        </div>

        {/* Grid of Case Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c, i) => {
            const Icon = c.icon;

            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`bg-[#121216] border ${c.border} rounded-2xl p-6 flex flex-col justify-between space-y-5 hover:bg-white/[0.02] transition-all`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
                      {c.tag}
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      {c.date}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
                      <Icon className={`w-5 h-5 ${c.color}`} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white leading-snug">
                        {c.title}
                      </h3>
                      <span className="text-xs font-semibold text-gray-400 block mt-0.5">
                        {c.metric}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    {c.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 text-[11px] text-gray-400 bg-white/[0.02] -mx-6 -mb-6 p-4 rounded-b-2xl">
                  <strong className="text-gray-200 block mb-0.5">Lição Fundamental:</strong>
                  <span>{c.lesson}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
