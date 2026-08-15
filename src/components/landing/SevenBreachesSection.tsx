import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BREACH_LAYERS, 
  BreachLayer 
} from './breachesData';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Key, 
  Database, 
  Cpu, 
  Terminal, 
  Building2, 
  Code2, 
  Info, 
  Sparkles,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const SevenBreachesSection = ({ onAuditTrigger }: { onAuditTrigger: () => void }) => {
  const [activeLayerId, setActiveLayerId] = useState<number>(1);
  const [codeTab, setCodeTab] = useState<'vulnerable' | 'secure'>('vulnerable');
  const [copied, setCopied] = useState(false);

  const currentLayer = BREACH_LAYERS.find(l => l.id === activeLayerId) || BREACH_LAYERS[0];

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="sete-brechas" className="py-24 bg-[#0a0a0d] border-b border-white/10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            Análise Aprofundada
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            As 7 Brechas Invisíveis do <span className="text-red-400">VibeCoding</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Descubra exatamente por que a inteligência artificial não consegue proteger o seu aplicativo por conta própria e como cada camada de segurança foi explorada em casos reais.
          </p>
        </div>

        {/* 7 Layers Horizontal / Grid Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
          {BREACH_LAYERS.map((layer) => {
            const Icon = layer.icon;
            const isActive = layer.id === activeLayerId;

            return (
              <button
                key={layer.id}
                onClick={() => {
                  setActiveLayerId(layer.id);
                  setCodeTab('vulnerable');
                }}
                className={cn(
                  "flex flex-col items-center text-center p-3 sm:p-4 rounded-xl border transition-all cursor-pointer relative",
                  isActive 
                    ? "bg-red-500/10 border-red-500/50 text-white shadow-lg shadow-red-500/10" 
                    : "bg-[#121215] border-white/10 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/20"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors",
                  isActive ? "bg-red-500 text-white" : "bg-white/5 text-gray-400"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400/80 mb-0.5">
                  {layer.layerNumber}
                </span>
                <span className="text-xs font-semibold leading-tight line-clamp-2">
                  {layer.category}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-red-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Detailed Layer Content Showcase */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLayer.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="bg-[#121216] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-8"
          >
            {/* Top Bar of Active Layer */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                    {currentLayer.layerNumber} de 7
                  </span>
                  <span className="text-xs font-medium text-gray-400">
                    {currentLayer.category}
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {currentLayer.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onAuditTrigger}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auditar Meu Código Agora
                </button>
              </div>
            </div>

            {/* 3-Column Info Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column (5 Cols): Explanations & Incident */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Short Summary */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Como a Falha Funciona
                  </h4>
                  <p className="text-sm text-gray-200 leading-relaxed">
                    {currentLayer.vulnerabilityExplanation}
                  </p>
                </div>

                {/* Real Case Study Box */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      {currentLayer.incidentTitle}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {currentLayer.incidentDate}
                    </span>
                  </div>
                  <p className="text-xs text-red-200 leading-relaxed">
                    {currentLayer.incidentDetails}
                  </p>
                  <div className="text-[11px] font-semibold text-red-300 bg-red-500/20 p-2 rounded-lg">
                    ⚠️ Impacto: {currentLayer.incidentImpact}
                  </div>
                </div>

                {/* Simple Analogy */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 block mb-0.5">Analogia Prática:</span>
                    <span>{currentLayer.analogy}</span>
                  </div>
                </div>

                {/* How Vibe Workbench Neutralizes It */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2 text-xs">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Como o Vibe Workbench Protege
                  </div>
                  <p className="text-emerald-200 leading-relaxed">
                    {currentLayer.howWeProtect}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentLayer.ruleIds.map(rule => (
                      <span key={rule} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono text-[10px]">
                        Regra {rule}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column (7 Cols): Interactive Code Diff Viewer */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Code Tabs Header */}
                <div className="flex items-center justify-between bg-[#0e0e11] border border-white/10 rounded-t-xl p-2 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCodeTab('vulnerable')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
                        codeTab === 'vulnerable'
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Código Gerado por IA (Vulnerável)
                    </button>

                    <button
                      onClick={() => setCodeTab('secure')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
                        codeTab === 'secure'
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Blindagem Vibe Workbench
                    </button>
                  </div>

                  <button
                    onClick={() => handleCopyCode(
                      codeTab === 'vulnerable'
                        ? currentLayer.vulnerableCodeSnippet.code
                        : currentLayer.secureCodeSnippet.code
                    )}
                    className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/5 transition-colors"
                    title="Copiar código"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Code Box */}
                <div className="bg-[#09090b] border border-white/10 rounded-b-xl overflow-hidden font-mono text-xs shadow-2xl">
                  <div className="px-4 py-2 bg-white/5 border-b border-white/5 text-[11px] text-gray-400 flex items-center justify-between">
                    <span>
                      {codeTab === 'vulnerable' 
                        ? currentLayer.vulnerableCodeSnippet.filename 
                        : currentLayer.secureCodeSnippet.filename}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {codeTab === 'vulnerable' ? '🔴 NÃO FAÇA ISSO' : '🟢 PADRÃO BLINDADO'}
                    </span>
                  </div>

                  <pre className="p-4 overflow-x-auto text-gray-300 leading-relaxed text-xs">
                    <code>
                      {codeTab === 'vulnerable'
                        ? currentLayer.vulnerableCodeSnippet.code
                        : currentLayer.secureCodeSnippet.code}
                    </code>
                  </pre>
                </div>

                {/* Code Explanation Tag */}
                <div className="text-xs text-gray-400 flex items-center justify-between px-1">
                  <span>
                    {codeTab === 'vulnerable' 
                      ? '⚠️ Este padrão é gerado rotineiramente por LLMs padrão sem regras de catálogo estritas.' 
                      : '🛡️ O Vibe Workbench gera automaticamente o patch (.patch) para transformar o código acima.'}
                  </span>
                </div>

              </div>

            </div>

          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
};
