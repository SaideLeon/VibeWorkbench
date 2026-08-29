import { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  Terminal, 
  Wrench, 
  Layers, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert, 
  Cpu,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveReasoningStreamProps {
  repoName?: string;
  activeFile?: string;
  isHarnessMode?: boolean;
}

const REASONING_STAGES = [
  {
    phase: 'Plano Cognitivo',
    icon: Layers,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
    message: 'Decompondo meta do usuário e mapeando escopo de arquivos no repositório...'
  },
  {
    phase: 'Tool: tool_scan_ast',
    icon: Wrench,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/10',
    message: 'Varrendo AST, detectando chamadas sensíveis, importações e regras vulneráveis...'
  },
  {
    phase: 'Cadeia de Raciocínio (CoT)',
    icon: BrainCircuit,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    message: 'Avaliando premissas de segurança, fluxo de dados e hipóteses de mitigação...'
  },
  {
    phase: 'Tool: tool_generate_patch',
    icon: Cpu,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
    message: 'Sintetizando patches defensivos cirúrgicos sem quebras estruturais...'
  },
  {
    phase: 'Validação e Síntese',
    icon: CheckCircle2,
    color: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    bgColor: 'bg-indigo-500/10',
    message: 'Executando auto-verificação do raciocínio e formatando conclusão técnica...'
  }
];

export const LiveReasoningStream = ({ repoName, activeFile, isHarnessMode = true }: LiveReasoningStreamProps) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => +(prev + 0.1).toFixed(1));
    }, 100);

    const stageInterval = setInterval(() => {
      setCurrentStageIdx(prev => (prev < REASONING_STAGES.length - 1 ? prev + 1 : prev));
    }, 2800);

    return () => {
      clearInterval(timer);
      clearInterval(stageInterval);
    };
  }, []);

  const currentStage = REASONING_STAGES[currentStageIdx];
  const StageIcon = currentStage.icon;

  return (
    <div className="mb-4 rounded-xl border border-indigo-500/30 bg-[#0f0f16] p-3.5 shadow-lg shadow-indigo-950/20">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400 animate-pulse">
            <BrainCircuit className="w-3 h-3 text-indigo-300 animate-spin" />
          </div>
          <span className="text-xs font-semibold text-indigo-200">
            DeepSeek-Harness • Execução em Tempo Real
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-white/5">
            <Clock className="w-2.5 h-2.5 text-indigo-400" />
            {elapsedSeconds.toFixed(1)}s
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
      </div>

      {/* Progress Stepper Line */}
      <div className="py-3 flex items-center justify-between gap-1 overflow-x-auto">
        {REASONING_STAGES.map((stg, idx) => {
          const isDone = idx < currentStageIdx;
          const isCurrent = idx === currentStageIdx;
          const isUpcoming = idx > currentStageIdx;

          return (
            <div key={idx} className="flex items-center gap-1.5 min-w-0">
              <div className={cn(
                "px-2 py-1 rounded-md text-[10px] font-medium border flex items-center gap-1 transition-all",
                isCurrent && `${stg.bgColor} ${stg.borderColor} ${stg.color} ring-1 ring-indigo-500/40 scale-105 shadow-sm`,
                isDone && "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
                isUpcoming && "bg-white/[0.02] border-white/5 text-gray-500"
              )}>
                {isDone && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                {isCurrent && <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-300" />}
                <span className="truncate max-w-[100px] sm:max-w-[120px]">{stg.phase}</span>
              </div>
              {idx < REASONING_STAGES.length - 1 && (
                <span className={cn(
                  "w-2 h-[1px]",
                  idx < currentStageIdx ? "bg-emerald-500/50" : "bg-white/10"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Live Thought Terminal Feed */}
      <div className="p-2.5 rounded-lg bg-[#08080c] border border-white/5 text-xs font-mono space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-indigo-400" />
            <span className="text-gray-300 font-semibold">{currentStage.phase}</span>
          </span>
          <span className="text-[9px] text-gray-500 uppercase">Fase {currentStageIdx + 1}/{REASONING_STAGES.length}</span>
        </div>

        <div className="text-indigo-200/90 text-[11px] leading-relaxed flex items-start gap-1.5 pt-0.5">
          <span className="text-indigo-400 font-bold">›</span>
          <span className="animate-pulse">{currentStage.message}</span>
        </div>

        {activeFile && (
          <div className="text-[10px] text-gray-400 truncate pt-1 border-t border-white/5 flex items-center gap-1">
            <span className="text-gray-500">Arquivo de Foco:</span>
            <span className="text-indigo-300 font-semibold">{activeFile}</span>
          </div>
        )}
      </div>
    </div>
  );
};
