import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Loader2, 
  Github, 
  Sparkles, 
  ArrowRight, 
  Terminal, 
  Lock, 
  Key, 
  AlertTriangle,
  PlayCircle,
  FileCode2,
  Check
} from 'lucide-react';

interface HeroSectionProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  onOpenWorkbench: () => void;
  onExploreBreaches: () => void;
  onOpenCalculator: () => void;
}

export const HeroSection = ({
  onAnalyze,
  isLoading,
  onOpenWorkbench,
  onExploreBreaches,
  onOpenCalculator
}: HeroSectionProps) => {
  const [repoInput, setRepoInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoInput.trim()) {
      onAnalyze(repoInput.trim());
    }
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-white/10">
      {/* Background Gradients & Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-500/15 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-24 right-10 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-48 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Headline */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center max-w-4xl mx-auto space-y-6"
        >
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Sua IA construiu o app.{' '}
            <span className="bg-gradient-to-r from-red-400 via-amber-300 to-indigo-400 bg-clip-text text-transparent">
              Nós encontramos o que ela esqueceu de proteger.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Analise o código, descubra vulnerabilidades invisíveis e corrija os riscos antes que cheguem à produção.
            <span className="block mt-2 text-gray-400 text-sm sm:text-base">
              O <strong>Mitigar IA</strong> audita seus repositórios GitHub, localiza as brechas em segundos e gera <strong>Blueprints e patches de correção automática</strong>.
            </span>
            <span className="block mt-3 text-gray-500 text-xs sm:text-sm italic">
              Sem processo de compliance, sem sales call, sem preço de plataforma corporativa — feito para quem constrói sozinho ou em time pequeno.
            </span>
          </p>
        </motion.div>

        {/* Live GitHub Scanner Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 max-w-2xl mx-auto"
        >
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500 via-indigo-500 to-purple-600 rounded-2xl opacity-40 group-hover:opacity-75 transition duration-500 blur-md" />
            
            <div className="relative flex flex-col sm:flex-row items-stretch bg-[#121215] border border-white/15 rounded-xl p-2 gap-2 shadow-2xl">
              <div className="flex items-center flex-1 px-3 py-2 sm:py-0">
                <Github className="w-5 h-5 text-gray-400 shrink-0 mr-3" />
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="Cole a URL do GitHub (ex: github.com/user/repo)..."
                  className="w-full bg-transparent border-none text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-0 min-w-0"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !repoInput.trim()}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Auditando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Auditar Repositório</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Quick Action Navigation Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            onClick={onExploreBreaches}
            className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Explorar as 7 Brechas Críticas
          </button>

          <button
            onClick={onOpenCalculator}
            className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-amber-400" />
            Calcular Risco do Meu App
          </button>

          <button
            onClick={onOpenWorkbench}
            className="px-4 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <FileCode2 className="w-4 h-4 text-indigo-400" />
            Abrir Workbench Completo
          </button>
        </motion.div>

        {/* Impact Numbers Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto"
        >
          <div className="bg-[#111114] border border-white/10 rounded-xl p-5 text-center relative overflow-hidden">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">41%</div>
            <div className="text-xs text-gray-400 mt-1 font-medium">Do código mundial produzido por IA em 2025</div>
          </div>

          <div className="bg-[#111114] border border-red-500/20 rounded-xl p-5 text-center relative overflow-hidden">
            <div className="text-2xl sm:text-3xl font-extrabold text-red-400">70.000</div>
            <div className="text-xs text-gray-400 mt-1 font-medium">Documentos e fotos vazadas no caso TiaApp</div>
          </div>

          <div className="bg-[#111114] border border-amber-500/20 rounded-xl p-5 text-center relative overflow-hidden">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">380.000</div>
            <div className="text-xs text-gray-400 mt-1 font-medium">Apps VibeCode públicos com dados expostos (Red Access)</div>
          </div>

          <div className="bg-[#111114] border border-emerald-500/20 rounded-xl p-5 text-center relative overflow-hidden">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">36 Regras</div>
            <div className="text-xs text-gray-400 mt-1 font-medium">Catálogo estrito de segurança R01-R25 & CTF</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
