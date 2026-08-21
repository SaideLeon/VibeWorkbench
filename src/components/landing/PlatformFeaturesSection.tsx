import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  FileCode2, 
  Layers, 
  Lock, 
  Terminal, 
  Cpu, 
  CheckCircle2, 
  ArrowRight,
  Database,
  Building2,
  Sparkles,
  Download
} from 'lucide-react';

interface PlatformFeaturesSectionProps {
  onStartAudit: () => void;
}

export const PlatformFeaturesSection = ({ onStartAudit }: PlatformFeaturesSectionProps) => {
  const features = [
    {
      icon: ShieldCheck,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      title: 'Auditor AST Multi-Ficheiro & Catálogo R01–R25',
      description: 'Varre múltiplos arquivos simultaneamente confrontando o código contra 36 regras de segurança severas (hashes de senha, SQL injection, XSS, rate limiting e race conditions).',
      badge: '36 Regras Oficiais'
    },
    {
      icon: Download,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
      title: 'Geração de Blueprints & Patches (.patch e .md)',
      description: 'Não apenas aponta os erros: gera um relatório detalhado com plano de remediação e o arquivo .patch que você aplica diretamente com "git apply" em segundos.',
      badge: 'Git Patch Pronto'
    },
    {
      icon: Lock,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      title: 'Cofre de Segredos & Proxies de API Servidores',
      description: 'Converte automaticamente chamadas de IA, Stripe e banco de dados que estavam expostas no cliente para rotas protegidas em Next.js API Routes.',
      badge: 'Zero Chaves no Front-end'
    },
    {
      icon: Database,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      title: 'Validador de Políticas RLS para Supabase & Postgres',
      description: 'Inspeciona suas migrações e consultas, impedindo que tabelas privadas fiquem abertas ao público através da anon_key com regras restritivas por padrão.',
      badge: 'Row Level Security'
    },
    {
      icon: Cpu,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      title: 'Controle de Infraestrutura & Human-in-the-Loop',
      description: 'Substitui a ilusão de prompts textuais por travas físicas de infraestrutura: separação estrita de ambientes de teste e portão de aprovação humana para ações destrutivas.',
      badge: 'Anti-Alucinação'
    },
    {
      icon: Building2,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
      title: 'Painel Único para Times Pequenos',
      description: 'Um lugar simples para dev solo, cofundador técnico ou squad de 2 a 5 pessoas acompanhar a segurança de todos os projetos — sem processo de compliance corporativo, sem sales call.',
      badge: 'Feito para Times Pequenos'
    }
  ];

  return (
    <section id="recursos" className="py-24 bg-[#0d0d10] border-b border-white/10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Como o <span className="text-indigo-400">Mitigar IA</span> Blinda Suas Aplicações
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Segurança de nível profissional, sem a complexidade nem o preço de uma plataforma de governança corporativa. Feito para quem constrói sozinho ou em time pequeno — não para um time de AppSec dedicado.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;

            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-[#121216] border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-white/20 transition-all hover:bg-white/[0.03] group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${f.bg} ${f.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10 font-mono">
                      {f.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {f.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    {f.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-xs font-semibold text-indigo-400">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                  <span>Integrado ao Mitigar IA</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-16 bg-gradient-to-r from-indigo-950/40 via-[#151520] to-purple-950/40 border border-indigo-500/30 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center md:text-left">
            <h4 className="text-xl font-bold text-white">
              Pronto para Auditar e Blindar Seu Repositório?
            </h4>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
              Cole o link do seu projeto GitHub e receba o score de segurança, a lista de vulnerabilidades encontradas e o Blueprint de correção com patch para download.
            </p>
          </div>

          <button
            onClick={onStartAudit}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg flex items-center gap-2 shrink-0 hover:scale-105 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Iniciar Auditoria de Código</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};
