import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldAlert, 
  BrainCircuit, 
  FileCode, 
  CheckCircle2, 
  Clock, 
  Terminal, 
  Layers, 
  Cpu, 
  Flame, 
  Eye, 
  Sparkles, 
  Scan,
  AlertTriangle,
  Play,
  Pause,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScannedFileItem {
  path: string;
  content?: string;
}

interface LiveAuditCodeScannerProps {
  files: ScannedFileItem[];
  progressMessage?: string;
  isHarnessMode?: boolean;
  phase?: string;
  serverActiveFileIndex?: number;
  serverActiveFilePath?: string;
  onSelectFile?: (path: string) => void;
}

// Tokenizador sintático rápido e leve para destacar o código em tempo real
function tokenizeLine(line: string): { type: string; value: string }[] {
  if (!line) return [{ type: 'plain', value: ' ' }];
  
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
    return [{ type: 'comment', value: line }];
  }

  const tokens: { type: string; value: string }[] = [];
  const regex = /(\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|export|from|type|interface|class|function|const|let|var|async|await|return|if|else|try|catch|throw|finally|new|typeof|instanceof|switch|case|default|while|for|of|in|public|private|protected|static|readonly|null|undefined|true|false|void)\b|\b(?:Promise|Array|Record|Set|Map|String|Number|Boolean|Object|NextResponse|NextRequest|Error|Buffer|Response|Request)\b|\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()|\b\d+\b|[{}()\[\],;.:?!=&|+\-*\/%<>^~]+|[^\s{}()\[\],;.:?!=&|+\-*\/%<>^~]+|\s+)/g;
  
  let match: RegExpExecArray | null;
  let lastIdx = 0;

  while ((match = regex.exec(line)) !== null) {
    const raw = match[0];
    if (match.index > lastIdx) {
      tokens.push({ type: 'plain', value: line.substring(lastIdx, match.index) });
    }
    
    if (raw.startsWith('//') || raw.startsWith('/*')) {
      tokens.push({ type: 'comment', value: raw });
    } else if (raw.startsWith('"') || raw.startsWith("'") || raw.startsWith('`')) {
      tokens.push({ type: 'string', value: raw });
    } else if (/^(import|export|from|type|interface|class|function|const|let|var|async|await|return|if|else|try|catch|throw|finally|new|typeof|instanceof|switch|case|default|while|for|of|in|public|private|protected|static|readonly|null|undefined|true|false|void)$/.test(raw)) {
      tokens.push({ type: 'keyword', value: raw });
    } else if (/^(Promise|Array|Record|Set|Map|String|Number|Boolean|Object|NextResponse|NextRequest|Error|Buffer|Response|Request)$/.test(raw)) {
      tokens.push({ type: 'type', value: raw });
    } else if (/^\d+$/.test(raw)) {
      tokens.push({ type: 'number', value: raw });
    } else if (match.index + raw.length < line.length && line[match.index + raw.length] === '(') {
      tokens.push({ type: 'function', value: raw });
    } else {
      tokens.push({ type: 'plain', value: raw });
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < line.length) {
    tokens.push({ type: 'plain', value: line.substring(lastIdx) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'plain', value: line }];
}

// Regras de catálogo para exibir no radar de validação
const SECURITY_RULES = [
  { id: 'R01', name: 'Sanitização de Input & SQLi', desc: 'Validação de parâmetros e prepared statements' },
  { id: 'R02', name: 'XSS & Escape de HTML', desc: 'Injeção de script em templates e componentes' },
  { id: 'R03a', name: 'Chaves & Segredos Hardcoded', desc: 'Detecção em arquivos de config e fontes' },
  { id: 'R03b', name: 'Entropia de Tokens & Vivos', desc: 'Stripe, AWS, Gemini, OpenAI e JWTs' },
  { id: 'R04', name: 'Controle de Acesso & RBAC', desc: 'Permissões por usuário e rotas privadas' },
  { id: 'R07', name: 'SSRF & Requisições Externas', desc: 'Validação de URLs de destino e whitelist' },
  { id: 'R14', name: 'Memory Leaks & Sockets', desc: 'Limpeza de listeners e timers no unmount' },
  { id: 'R18', name: 'CORS & Headers de Segurança', desc: 'Origin validation, CSP e HSTS' },
  { id: 'R22', name: 'Dependências & Prototypes', desc: 'Prototype pollution e pacotes vulneráveis' },
];

const DEFAULT_FILES: ScannedFileItem[] = [
  { 
    path: 'projeto/verificando_arquivos.ts', 
    content: '// Inicializando árvore AST e contexto de segurança...\n// Analisando estrutura sintática e nós semânticos.\n// Carregando catálogo de regras de segurança determinísticas.' 
  }
];

export const LiveAuditCodeScanner: React.FC<LiveAuditCodeScannerProps> = ({
  files,
  progressMessage,
  isHarnessMode = true,
  phase = 'auditing',
  serverActiveFileIndex,
  serverActiveFilePath,
  onSelectFile
}) => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [activeLineNumber, setActiveLineNumber] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [activeRuleIndex, setActiveRuleIndex] = useState(0);
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; type: 'info' | 'scan' | 'pass' | 'warn' }>>(() => [
    {
      id: 'init-0',
      time: new Date().toLocaleTimeString('pt-PT', { hour12: false, minute: '2-digit', second: '2-digit' }),
      text: '[AST::Init] Inicializando varredura em tempo real com catálogo de regras de segurança.',
      type: 'info'
    }
  ]);
  const [completedFileIndices, setCompletedFileIndices] = useState<number[]>([]);

  const codeContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Lista estável de arquivos
  const safeFiles = useMemo(() => {
    if (!files || files.length === 0) {
      return DEFAULT_FILES;
    }
    return files;
  }, [files]);

  // Sincroniza com o índice de arquivo real do servidor quando emitido via SSE
  useEffect(() => {
    if (typeof serverActiveFileIndex === 'number' && serverActiveFileIndex >= 0 && serverActiveFileIndex < safeFiles.length) {
      setActiveFileIndex(serverActiveFileIndex);
      setActiveLineNumber(1);
      
      setCompletedFileIndices(prev => {
        const next = [...prev];
        for (let i = 0; i < serverActiveFileIndex; i++) {
          if (!next.includes(i)) next.push(i);
        }
        return next;
      });

      const currentPath = safeFiles[serverActiveFileIndex]?.path || '';
      const fileName = currentPath.split('/').pop() || currentPath;
      const timeStr = new Date().toLocaleTimeString('pt-PT', { hour12: false, minute: '2-digit', second: '2-digit' });
      setLogs(prev => [
        {
          id: `srv-${Date.now()}-${serverActiveFileIndex}`,
          time: timeStr,
          text: `[Server::AST] Analisando ${fileName} (${serverActiveFileIndex + 1}/${safeFiles.length})`,
          type: 'scan'
        },
        ...prev.slice(0, 15)
      ]);
    }
  }, [serverActiveFileIndex, safeFiles]);

  const currentFile = safeFiles[activeFileIndex] || safeFiles[0] || DEFAULT_FILES[0];
  const fileLines = useMemo(() => {
    const raw = currentFile?.content || '// Nenhum conteúdo de código disponível para este arquivo.';
    return raw.split('\n');
  }, [currentFile?.content]);

  // Cronômetro decorrido
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotação de regras avaliadas
  useEffect(() => {
    const ruleTimer = setInterval(() => {
      setActiveRuleIndex(prev => (prev + 1) % SECURITY_RULES.length);
    }, 2800);
    return () => clearInterval(ruleTimer);
  }, []);

  // Motor de simulação de varredura AST em tempo real e geração de logs desacoplada
  useEffect(() => {
    if (!isAutoPlaying || fileLines.length === 0) return;

    let tickCount = 0;
    const lineInterval = setInterval(() => {
      tickCount++;

      setActiveLineNumber(prevLine => {
        const nextLine = prevLine + Math.floor(Math.random() * 3) + 1;
        if (nextLine >= fileLines.length) {
          // Arquivo concluído: avança para o próximo
          setCompletedFileIndices(prevCompleted => {
            if (!prevCompleted.includes(activeFileIndex)) {
              return [...prevCompleted, activeFileIndex];
            }
            return prevCompleted;
          });

          setActiveFileIndex(prevIdx => {
            if (prevIdx < safeFiles.length - 1) {
              return prevIdx + 1;
            }
            return 0; // Volta para o primeiro arquivo
          });

          return 1;
        }
        return nextLine;
      });

      // Adiciona log periódico a cada 5 ticks
      if (tickCount % 5 === 0) {
        const fileName = currentFile.path.split('/').pop() || currentFile.path;
        const rule = SECURITY_RULES[activeRuleIndex] || SECURITY_RULES[0];
        const timeStr = new Date().toLocaleTimeString('pt-PT', { hour12: false, minute: '2-digit', second: '2-digit' });
        
        setLogs(prev => [
          {
            id: `${Date.now()}-${Math.random()}`,
            time: timeStr,
            text: `[AST::${rule.id}] Inspecionando ${fileName} • ${rule.name}`,
            type: Math.random() > 0.8 ? 'pass' : 'scan'
          },
          ...prev.slice(0, 15)
        ]);
      }
    }, 180);

    return () => clearInterval(lineInterval);
  }, [isAutoPlaying, fileLines.length, activeFileIndex, safeFiles.length, currentFile.path, activeRuleIndex]);

  // Rolagem suave com throttle
  useEffect(() => {
    if (activeLineRef.current && codeContainerRef.current) {
      const container = codeContainerRef.current;
      const lineEl = activeLineRef.current;
      const offsetTop = lineEl.offsetTop - container.offsetTop;
      
      container.scrollTo({
        top: Math.max(0, offsetTop - 120),
        behavior: 'smooth'
      });
    }
  }, [activeLineNumber]);

  // Estatísticas calculadas de forma segura
  const totalLinesScanned = useMemo(() => {
    let count = 0;
    const completedSet = new Set(completedFileIndices);
    safeFiles.forEach((f, idx) => {
      const lines = (f.content || '').split('\n').length;
      if (completedSet.has(idx)) {
        count += lines;
      } else if (idx === activeFileIndex) {
        count += Math.min(activeLineNumber, lines);
      }
    });
    return count;
  }, [safeFiles, completedFileIndices, activeFileIndex, activeLineNumber]);

  const totalLinesOverall = useMemo(() => {
    return safeFiles.reduce((acc, f) => acc + (f.content || '').split('\n').length, 0);
  }, [safeFiles]);

  const percentageScanned = useMemo(() => {
    if (totalLinesOverall === 0) return 0;
    const pct = Math.min(96, Math.round((totalLinesScanned / Math.max(1, totalLinesOverall)) * 100));
    return Math.max(12, pct);
  }, [totalLinesScanned, totalLinesOverall]);

  const currentRule = SECURITY_RULES[activeRuleIndex];

  return (
    <div className="bg-[#0e0e11] border border-indigo-500/20 rounded-xl overflow-hidden shadow-2xl flex flex-col w-full text-gray-200 transition-all duration-300 font-sans">
      {/* Progress Bar with Gradient */}
      <div className="w-full bg-black/60 h-1.5 relative overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300 relative"
          style={{ width: `${percentageScanned}%` }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-white/40 blur-xs animate-pulse" />
        </div>
      </div>

      {/* Compact Telemetry & Active Rule Ribbon */}
      <div className="px-3.5 py-2.5 bg-[#14141a] border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-white bg-indigo-600 px-2 py-0.5 rounded text-[10px] tracking-wide shrink-0">
            {currentRule.id}
          </span>
          <span className="text-gray-200 font-medium truncate">{currentRule.name}</span>
          <span className="text-gray-400 text-[11px] hidden sm:inline truncate">• {currentRule.desc}</span>
        </div>

        {/* Telemetry counters */}
        <div className="flex items-center gap-2 text-xs font-mono ml-auto">
          <div className="bg-black/50 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 text-gray-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}</span>
          </div>

          <div className="bg-black/50 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 text-gray-300">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>{activeFileIndex + 1}/{safeFiles.length} arqs</span>
          </div>

          <div className="bg-black/50 px-2.5 py-1 rounded-lg border border-white/10 hidden md:flex items-center gap-1.5 text-emerald-400">
            <FileCode className="w-3.5 h-3.5" />
            <span>{totalLinesScanned.toLocaleString()} lin.</span>
          </div>

          <button
            type="button"
            onClick={() => setIsAutoPlaying(prev => !prev)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title={isAutoPlaying ? "Pausar visualizador" : "Continuar visualizador"}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Grid: Left File Navigator + Center Code Radar + Right Rule Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-white/10 min-h-[420px] max-h-[560px]">
        {/* Column 1: Files Rail (3 cols on desktop) */}
        <div className="lg:col-span-4 bg-[#111116] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col overflow-hidden max-h-[160px] lg:max-h-none">
          <div className="p-2.5 bg-black/30 border-b border-white/5 flex items-center justify-between text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-indigo-400" />
              Arquivos no Escopo ({safeFiles.length})
            </span>
            <span className="text-[10px] text-indigo-400 font-mono">{percentageScanned}%</span>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-1 divide-y divide-white/5">
            {safeFiles.map((file, idx) => {
              const isCurrent = idx === activeFileIndex;
              const isDone = completedFileIndices.includes(idx);
              const fileName = file.path.split('/').pop() || file.path;
              const fileDir = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '';

              return (
                <button
                  key={file.path || idx}
                  type="button"
                  onClick={() => {
                    setActiveFileIndex(idx);
                    setActiveLineNumber(1);
                    if (onSelectFile) onSelectFile(file.path);
                  }}
                  className={cn(
                    "w-full text-left p-2 rounded-lg text-xs font-mono flex items-center justify-between gap-2 transition-all cursor-pointer",
                    isCurrent 
                      ? "bg-indigo-600/20 text-indigo-200 border border-indigo-500/40 shadow-sm" 
                      : isDone
                      ? "hover:bg-white/5 text-gray-300 opacity-90"
                      : "hover:bg-white/5 text-gray-400 opacity-70"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="font-medium text-gray-200 truncate">{fileName}</div>
                      {fileDir && <div className="text-[10px] text-gray-500 truncate">{fileDir}</div>}
                    </div>
                  </div>

                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0",
                    isCurrent 
                      ? "bg-indigo-500/30 text-indigo-300 font-bold animate-pulse" 
                      : isDone
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-white/5 text-gray-500"
                  )}>
                    {isCurrent ? `L${activeLineNumber}` : isDone ? 'Auditado' : 'Fila'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: Live Code Scanner Viewer (8 cols on desktop) */}
        <div className="lg:col-span-8 bg-[#0c0c0f] flex flex-col overflow-hidden relative">
          {/* File Header Bar */}
          <div className="p-2.5 bg-[#121217] border-b border-white/5 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 truncate">
              <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-gray-200 font-medium truncate">{currentFile.path}</span>
              <span className="text-[10px] text-gray-500">({fileLines.length} linhas)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px]">
                <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                <span>AST Node Inspection</span>
              </div>
            </div>
          </div>

          {/* Active Rule Tag Floating Over Code */}
          <div className="bg-indigo-950/60 border-b border-indigo-500/20 px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-indigo-300">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white bg-indigo-600 px-1.5 py-0.2 rounded text-[10px]">{currentRule.id}</span>
              <span className="text-gray-200">{currentRule.name}</span>
              <span className="text-gray-400 hidden sm:inline">• {currentRule.desc}</span>
            </div>
            <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              Verificando
            </span>
          </div>

          {/* Code Body with Scanner Beam */}
          <div 
            ref={codeContainerRef}
            className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed relative select-text"
          >
            {fileLines.map((line, idx) => {
              const lineNum = idx + 1;
              const isCurrentScan = lineNum === activeLineNumber;
              const isNearScan = Math.abs(lineNum - activeLineNumber) <= 2;
              const tokens = tokenizeLine(line);

              // Detecta palavras-chave sensíveis na linha para feedback visual enriquecido
              const hasSensitiveKeyword = /(token|secret|password|sk_live|auth|bearer|eval|dangerouslySetInnerHTML|process\.env|exec|query|SELECT|WHERE)/i.test(line);

              return (
                <div
                  key={idx}
                  ref={isCurrentScan ? activeLineRef : undefined}
                  className={cn(
                    "flex items-start rounded px-2 py-0.5 transition-colors relative group",
                    isCurrentScan 
                      ? "bg-indigo-500/20 border-l-2 border-indigo-400 shadow-sm" 
                      : isNearScan
                      ? "bg-white/[0.02]"
                      : "hover:bg-white/[0.01]"
                  )}
                >
                  {/* Line Number */}
                  <span className={cn(
                    "w-9 shrink-0 text-right pr-3 select-none text-[10px]",
                    isCurrentScan ? "text-indigo-300 font-bold" : "text-gray-600"
                  )}>
                    {lineNum}
                  </span>

                  {/* Code Tokens */}
                  <span className="flex-1 whitespace-pre break-all font-mono">
                    {tokens.map((tok, tIdx) => {
                      let color = 'text-gray-300';
                      if (tok.type === 'comment') color = 'text-gray-500 italic';
                      else if (tok.type === 'string') color = 'text-emerald-300';
                      else if (tok.type === 'keyword') color = 'text-purple-400 font-semibold';
                      else if (tok.type === 'type') color = 'text-blue-300';
                      else if (tok.type === 'function') color = 'text-amber-300';
                      else if (tok.type === 'number') color = 'text-rose-300';

                      return (
                        <span key={tIdx} className={color}>
                          {tok.value}
                        </span>
                      );
                    })}
                  </span>

                  {/* In-line scanner indicator tag */}
                  {isCurrentScan && (
                    <span className="ml-2 px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 text-[9px] font-bold uppercase tracking-wider shrink-0 animate-pulse hidden sm:inline-block">
                      {hasSensitiveKeyword ? '⚠️ Inspecionando Token' : 'AST Check'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Live Activity Feed / Terminal Stream */}
      <div className="p-3 bg-[#0a0a0d] flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-gray-300 font-semibold uppercase tracking-wide">Fluxo de Eventos do Agente & AST</span>
          </div>
          <span className="text-[10px] text-gray-500">
            Avaliando AST, Taint Flow & Catálogo R01-R28
          </span>
        </div>

        <div className="bg-black/60 rounded-lg p-2 font-mono text-[10px] border border-white/5 space-y-1 max-h-20 overflow-y-auto">
          {logs.slice(0, 4).map(log => (
            <div key={log.id} className="flex items-center gap-2 text-gray-400">
              <span className="text-gray-600 shrink-0">[{log.time}]</span>
              <span className={cn(
                "truncate",
                log.type === 'pass' ? "text-emerald-400" : "text-gray-300"
              )}>
                {log.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
