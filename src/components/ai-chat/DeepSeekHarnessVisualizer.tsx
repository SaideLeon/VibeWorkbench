import { useState, useMemo } from 'react';
import { 
  Bot, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  Wrench, 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Clock, 
  Code2, 
  Copy, 
  Check, 
  FileCode2, 
  Maximize2, 
  Minimize2,
  Filter,
  Eye,
  Zap,
  ShieldCheck,
  Search,
  BrainCircuit,
  ArrowRight
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { AgentTrace } from '@/types';

interface DeepSeekHarnessVisualizerProps {
  traces: AgentTrace[];
  toolsUsed?: string[];
  isLive?: boolean;
  generatedPatches?: {
    filePath: string;
    diff: string;
    ruleId?: string;
    verified: boolean;
  }[];
  defaultOpen?: boolean;
}

export const DeepSeekHarnessVisualizer = ({
  traces,
  toolsUsed = [],
  isLive = false,
  generatedPatches = [],
  defaultOpen = false,
}: DeepSeekHarnessVisualizerProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || isLive);
  const [activeFilter, setActiveFilter] = useState<'all' | 'thought' | 'tool' | 'plan' | 'patch'>('all');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [isFullView, setIsFullView] = useState(false);

  // Toggle individual step expansion
  const toggleStep = (idx: number) => {
    setExpandedSteps(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    traces.forEach((_, i) => { all[i] = true; });
    setExpandedSteps(all);
  };

  const collapseAll = () => {
    setExpandedSteps({});
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Metrics calculation
  const totalDuration = useMemo(() => {
    return traces.reduce((acc, t) => acc + (t.durationMs || 0), 0);
  }, [traces]);

  const thoughtCount = useMemo(() => traces.filter(t => t.type === 'thought' || t.type === 'reflection').length, [traces]);
  const toolCallCount = useMemo(() => traces.filter(t => t.type === 'tool_call').length, [traces]);
  const planCount = useMemo(() => traces.filter(t => t.type === 'plan').length, [traces]);

  // Filter traces
  const filteredTraces = useMemo(() => {
    if (activeFilter === 'all') return traces;
    if (activeFilter === 'thought') return traces.filter(t => t.type === 'thought' || t.type === 'reflection');
    if (activeFilter === 'tool') return traces.filter(t => t.type === 'tool_call' || t.type === 'tool_result');
    if (activeFilter === 'plan') return traces.filter(t => t.type === 'plan' || t.type === 'final_output');
    return traces;
  }, [traces, activeFilter]);

  if (!traces || traces.length === 0) return null;

  return (
    <div className={cn(
      "mb-3.5 rounded-xl border transition-all duration-200 overflow-hidden shadow-md",
      isLive 
        ? "border-indigo-500/40 bg-[#0f0f15] shadow-indigo-500/5 ring-1 ring-indigo-500/20" 
        : "border-indigo-500/20 bg-[#101015]"
    )}>
      {/* Header Bar */}
      <div className="w-full px-3.5 py-2.5 flex items-center justify-between bg-[#14141c] border-b border-indigo-500/15">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group flex-1"
        >
          <div className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all",
            isLive 
              ? "bg-indigo-600/30 border-indigo-400/40 text-indigo-300 animate-pulse" 
              : "bg-indigo-500/20 border-indigo-500/30 text-indigo-400 group-hover:bg-indigo-500/30"
          )}>
            <BrainCircuit className={cn("w-3.5 h-3.5", isLive && "animate-spin text-indigo-300")} />
          </div>

          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-indigo-100 flex items-center gap-1.5">
              <span>Mitigar</span>
              <span className="text-[11px] font-normal text-indigo-300/80">
                • Cadeia de Raciocínio ({traces.length} {traces.length === 1 ? 'passo' : 'passos'})
              </span>
            </span>

            {isLive ? (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                Raciocinando em Tempo Real
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Concluído {totalDuration > 0 && `(${totalDuration}ms)`}
              </span>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {toolsUsed && toolsUsed.length > 0 && (
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
              <Wrench className="w-2.5 h-2.5" />
              {toolsUsed.length} tools
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded text-gray-400 hover:text-indigo-300 hover:bg-white/5 transition-colors cursor-pointer"
            aria-label={isOpen ? "Ocultar traces" : "Expandir traces"}
          >
            {isOpen ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Expanded Traces Panel */}
      {isOpen && (
        <div className="bg-[#0b0b10] border-t border-indigo-500/10">
          {/* Action and Filter Ribbon */}
          <div className="px-3 py-2 bg-[#12121a] border-b border-white/5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={cn(
                  "px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors cursor-pointer",
                  activeFilter === 'all'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10"
                )}
              >
                Todos ({traces.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('thought')}
                className={cn(
                  "px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1",
                  activeFilter === 'thought'
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-white/5 text-purple-300 hover:text-purple-100 hover:bg-purple-500/10"
                )}
              >
                <Sparkles className="w-2.5 h-2.5" />
                CoT / Raciocínio ({thoughtCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('tool')}
                className={cn(
                  "px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1",
                  activeFilter === 'tool'
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-white/5 text-amber-300 hover:text-amber-100 hover:bg-amber-500/10"
                )}
              >
                <Wrench className="w-2.5 h-2.5" />
                Ferramentas ({toolCallCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('plan')}
                className={cn(
                  "px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1",
                  activeFilter === 'plan'
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white/5 text-blue-300 hover:text-blue-100 hover:bg-blue-500/10"
                )}
              >
                <Layers className="w-2.5 h-2.5" />
                Plano ({planCount})
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <button
                type="button"
                onClick={expandAll}
                className="hover:text-indigo-300 underline cursor-pointer"
              >
                Expandir tudo
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={collapseAll}
                className="hover:text-indigo-300 underline cursor-pointer"
              >
                Recolher
              </button>
            </div>
          </div>

          {/* Stepper Timeline List */}
          <div className={cn(
            "p-3 space-y-2.5 overflow-y-auto font-mono text-xs",
            isFullView ? "max-h-[650px]" : "max-h-[360px]"
          )}>
            {filteredTraces.map((step, idx) => {
              const isStepExpanded = expandedSteps[idx] ?? (step.type === 'thought' || step.type === 'tool_call');
              
              return (
                <div 
                  key={idx} 
                  className={cn(
                    "rounded-lg border transition-all duration-150 overflow-hidden",
                    step.type === 'plan' && "bg-[#101520] border-blue-500/20",
                    step.type === 'thought' && "bg-[#14101e] border-purple-500/20",
                    step.type === 'tool_call' && "bg-[#1b150c] border-amber-500/20",
                    step.type === 'tool_result' && "bg-[#0d1814] border-emerald-500/20",
                    step.type === 'final_output' && "bg-[#101424] border-indigo-500/20"
                  )}
                >
                  {/* Step Header */}
                  <div 
                    onClick={() => toggleStep(idx)}
                    className="px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-white/[0.02] select-none border-b border-white/[0.04]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0",
                        step.type === 'plan' && "bg-blue-500/20 text-blue-300 border border-blue-500/30",
                        step.type === 'thought' && "bg-purple-500/20 text-purple-300 border border-purple-500/30",
                        step.type === 'tool_call' && "bg-amber-500/20 text-amber-300 border border-amber-500/30",
                        step.type === 'tool_result' && "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                        step.type === 'final_output' && "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      )}>
                        {step.stepIndex + 1}
                      </span>

                      <span className={cn(
                        "font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded",
                        step.type === 'plan' && "text-blue-300",
                        step.type === 'thought' && "text-purple-300",
                        step.type === 'tool_call' && "text-amber-300",
                        step.type === 'tool_result' && "text-emerald-300",
                        step.type === 'final_output' && "text-indigo-300"
                      )}>
                        {step.type === 'plan' && '🎯 Plano de Análise'}
                        {step.type === 'thought' && '🧠 Raciocínio (CoT)'}
                        {step.type === 'tool_call' && `🛠️ Invocação: ${step.toolName || 'Tool'}`}
                        {step.type === 'tool_result' && `👁️ Observação: ${step.toolName || 'Tool'}`}
                        {step.type === 'final_output' && '✅ Síntese Final'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {step.durationMs !== undefined && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {step.durationMs}ms
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(step.content, idx);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Copiar conteúdo deste passo"
                      >
                        {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>

                      {isStepExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                  </div>

                  {/* Step Body */}
                  {isStepExpanded && (
                    <div className="p-3 space-y-2 text-[11px] leading-relaxed">
                      <div className="text-gray-200 whitespace-pre-wrap break-words font-sans">
                        {step.content}
                      </div>

                      {/* Tool Arguments View */}
                      {step.toolArgs && Object.keys(step.toolArgs).length > 0 && (
                        <div className="mt-2 rounded bg-black/50 border border-amber-500/20 overflow-hidden">
                          <div className="px-2.5 py-1 bg-amber-500/10 text-amber-300 text-[10px] font-semibold border-b border-amber-500/20 flex items-center justify-between">
                            <span>Parâmetros da Ferramenta ({step.toolName})</span>
                            <span className="text-[9px] text-amber-400/70">JSON payload</span>
                          </div>
                          <div className="p-2 text-[10px] text-amber-200/90 font-mono overflow-x-auto">
                            <pre>{JSON.stringify(step.toolArgs, null, 2)}</pre>
                          </div>
                        </div>
                      )}

                      {/* Tool Result View */}
                      {step.toolResult && (
                        <div className="mt-2 rounded bg-black/50 border border-emerald-500/20 overflow-hidden">
                          <div className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 text-[10px] font-semibold border-b border-emerald-500/20 flex items-center justify-between">
                            <span>Retorno Observado</span>
                            <span className="text-[9px] text-emerald-400/70">Saída da execução</span>
                          </div>
                          <div className="p-2 text-[10px] text-emerald-200/90 font-mono overflow-x-auto max-h-40">
                            <pre>{typeof step.toolResult === 'object' ? JSON.stringify(step.toolResult, null, 2) : String(step.toolResult)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Patches Quick Inspector if available */}
          {generatedPatches && generatedPatches.length > 0 && (
            <div className="px-3 py-2.5 bg-[#141520] border-t border-indigo-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">{generatedPatches.length} {generatedPatches.length === 1 ? 'patch cirúrgico gerado' : 'patches cirúrgicos gerados'}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {generatedPatches.every(p => p.verified) ? '100% Verificado via AST' : 'Verificação Completa'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
