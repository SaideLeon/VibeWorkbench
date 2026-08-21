import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Github, 
  Search, 
  Loader2, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles,
  Lock,
  FileCode2
} from 'lucide-react';

interface CTASectionProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  onOpenWorkbench: () => void;
}

export const CTASection = ({ onAnalyze, isLoading, onOpenWorkbench }: CTASectionProps) => {
  const [repoUrl, setRepoUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      onAnalyze(repoUrl.trim());
    }
  };

  return (
    <section className="py-24 bg-gradient-to-b from-[#0d0d10] to-[#08080a] border-b border-white/10 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        
        <div className="space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Não Espere Seus Dados Vazarem.{' '}
            <span className="bg-gradient-to-r from-red-400 via-amber-300 to-indigo-400 bg-clip-text text-transparent">
              Blinde Seu VibeCode Agora.
            </span>
          </h2>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            Cole o link do seu repositório GitHub e deixe o motor de raciocínio do Mitigar IA verificar todas as 7 brechas e gerar o Blueprint de remediação.
          </p>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-40 group-hover:opacity-75 transition duration-500 blur-md" />
            
            <div className="relative flex flex-col sm:flex-row items-stretch bg-[#121216] border border-white/15 rounded-xl p-2 gap-2 shadow-2xl">
              <div className="flex items-center flex-1 px-3 py-2 sm:py-0">
                <Github className="w-5 h-5 text-gray-400 shrink-0 mr-3" />
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/usuario/repositorio..."
                  className="w-full bg-transparent border-none text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-0 min-w-0"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !repoUrl.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              100% Seguro no Servidor
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Gera Patch .patch para Git
            </span>
            <span>•</span>
            <button
              onClick={onOpenWorkbench}
              className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Abrir Explorador & Chat de IA
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
