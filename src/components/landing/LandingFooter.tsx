import { Code2, ShieldAlert, Heart, Github, Sparkles } from 'lucide-react';

export const LandingFooter = ({ onOpenWorkbench }: { onOpenWorkbench: () => void }) => {
  return (
    <footer className="bg-[#070709] border-t border-white/10 py-12 text-gray-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-tight block">Vibe Workbench</span>
              <span className="text-[11px] text-gray-500">Auditoria & Blindagem de Segurança para VibeCoding</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-300">
            <a href="#sete-brechas" className="hover:text-white transition-colors">As 7 Brechas</a>
            <a href="#calculadora-risco" className="hover:text-white transition-colors">Calculadora de Risco</a>
            <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <button 
              onClick={onOpenWorkbench}
              className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Workbench Completo
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] text-gray-500">
          <p>
            Construído para a era da inteligência artificial. Proteja suas criações antes do deploy.
          </p>
          <div className="flex items-center gap-1.5">
            <span>Catálogo R01–R25 & CTF-R01–R11 integrado</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
