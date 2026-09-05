import { useState, useMemo, useEffect } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  GitCommit, 
  GitBranch, 
  Terminal, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  Layers, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Maximize2, 
  Minimize2, 
  Download, 
  FileCode2, 
  Filter, 
  Activity, 
  ArrowRight,
  ListTree,
  Cpu,
  Eye,
  RefreshCw,
  Zap,
  Code2
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { AgentTrace } from '@/types';

export interface ReasoningTracePanelProps {
  traces: AgentTrace[];
  toolsUsed?: string[];
  isLive?: boolean;
  generatedPatches?: {
    filePath: string;
    diff: string;
    ruleId?: string;
    verified: boolean;
  }[];
  title?: string;
  subtitle?: string;
  defaultViewMode?: 'tree' | 'timeline' | 'tools';
  defaultExpanded?: boolean;
  className?: string;
  onApplyPatch?: (filePath: string, diff: string) => void;
}

interface TreeNode {
  id: string;
  index: number;
  type: AgentTrace['type'];
  title: string;
  content: string;
  durationMs?: number;
  toolName?: string;
  toolArgs?: Record<string, any>;
  toolResult?: any;
  status: 'completed' | 'running' | 'pending' | 'success';
  children: TreeNode[];
  depth: number;
}

export const ReasoningTracePanel = ({
  traces = [],
  toolsUsed = [],
  isLive = false,
  generatedPatches = [],
  title = 'Mitigar • Árvore de Raciocínio & Decisão',
  subtitle,
  defaultViewMode = 'tree',
  defaultExpanded = true,
  className,
  onApplyPatch,
}: ReasoningTracePanelProps) => {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [viewMode, setViewMode] = useState<'tree' | 'timeline' | 'tools'>(defaultViewMode);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  // Inicializa a expansão padrão dos primeiros nós
  useEffect(() => {
    if (traces.length > 0) {
      const initialMap: Record<string, boolean> = {};
      traces.forEach((_, i) => {
        // Expandir os primeiros nós e nós de ferramentas
        if (i < 3 || traces[i]?.type === 'tool_call' || traces[i]?.type === 'thought') {
          initialMap[`node-${i}`] = true;
        }
      });
      setExpandedNodes(prev => ({ ...initialMap, ...prev }));
    }
  }, [traces.length]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    traces.forEach((_, i) => {
      all[`node-${i}`] = true;
    });
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  const handleCopyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadLog = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      toolsUsed,
      totalSteps: traces.length,
      generatedPatchesCount: generatedPatches.length,
      traces,
      generatedPatches,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mitigar-reasoning-tree-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Construção da árvore lógica de raciocínio
  const reasoningTree = useMemo<TreeNode[]>(() => {
    if (!traces || traces.length === 0) return [];

    const rootNodes: TreeNode[] = [];
    let currentPlanNode: TreeNode | null = null;
    let currentThoughtNode: TreeNode | null = null;

    traces.forEach((t, idx) => {
      const nodeId = `node-${idx}`;
      let nodeTitle = 'Passo de Análise';
      if (t.type === 'plan') nodeTitle = 'Planejamento Cognitivo & Metas';
      else if (t.type === 'thought') nodeTitle = 'Cadeia de Raciocínio (CoT)';
      else if (t.type === 'tool_call') nodeTitle = `Invocação AST: ${t.toolName || 'Tool'}`;
      else if (t.type === 'tool_result') nodeTitle = `Observação de Execução: ${t.toolName || 'Tool'}`;
      else if (t.type === 'final_output') nodeTitle = 'Síntese & Resolução Final';

      const treeNode: TreeNode = {
        id: nodeId,
        index: idx,
        type: t.type,
        title: nodeTitle,
        content: t.content,
        durationMs: t.durationMs,
        toolName: t.toolName,
        toolArgs: t.toolArgs,
        toolResult: t.toolResult,
        status: isLive && idx === traces.length - 1 ? 'running' : 'completed',
        children: [],
        depth: 0,
      };

      // Agrupamento hierárquico
      if (t.type === 'plan') {
        currentPlanNode = treeNode;
        currentThoughtNode = null;
        rootNodes.push(treeNode);
      } else if (t.type === 'thought') {
        if (currentPlanNode) {
          treeNode.depth = 1;
          currentPlanNode.children.push(treeNode);
        } else {
          rootNodes.push(treeNode);
        }
        currentThoughtNode = treeNode;
      } else if (t.type === 'tool_call' || t.type === 'tool_result') {
        if (currentThoughtNode) {
          treeNode.depth = (currentPlanNode ? 2 : 1);
          currentThoughtNode.children.push(treeNode);
        } else if (currentPlanNode) {
          treeNode.depth = 1;
          currentPlanNode.children.push(treeNode);
        } else {
          rootNodes.push(treeNode);
        }
      } else {
        rootNodes.push(treeNode);
      }
    });

    return rootNodes;
  }, [traces, isLive]);

  // Estatísticas computadas
  const stats = useMemo(() => {
    const totalMs = traces.reduce((acc, t) => acc + (t.durationMs || 0), 0);
    const counts = {
      total: traces.length,
      plan: traces.filter(t => t.type === 'plan').length,
      thought: traces.filter(t => t.type === 'thought' || t.type === 'reflection').length,
      tools: traces.filter(t => t.type === 'tool_call').length,
      results: traces.filter(t => t.type === 'tool_result').length,
      patches: generatedPatches.length,
      verifiedPatches: generatedPatches.filter(p => p.verified).length,
      totalMs,
    };
    return counts;
  }, [traces, generatedPatches]);

  // Filtragem de traces
  const filteredTraces = useMemo(() => {
    return traces.filter((t, idx) => {
      if (filterType !== 'all') {
        if (filterType === 'thought' && t.type !== 'thought' && t.type !== 'reflection') return false;
        if (filterType === 'tool' && t.type !== 'tool_call' && t.type !== 'tool_result') return false;
        if (filterType === 'plan' && t.type !== 'plan' && t.type !== 'final_output') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inContent = t.content.toLowerCase().includes(q);
        const inTool = t.toolName?.toLowerCase().includes(q);
        const inArgs = t.toolArgs ? JSON.stringify(t.toolArgs).toLowerCase().includes(q) : false;
        return inContent || inTool || inArgs;
      }

      return true;
    });
  }, [traces, filterType, searchQuery]);

  if (!traces || traces.length === 0) {
    if (isLive) {
      return (
        <div className="rounded-xl border border-indigo-500/30 bg-[#0d0d14] p-4 text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-indigo-300 text-xs font-semibold">
            <BrainCircuit className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Mitigar Inicializando Árvore de Raciocínio...</span>
          </div>
          <p className="text-[11px] text-gray-400">
            Conectando aos plugins espaciais de AST e construindo nós de decisão em tempo real.
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200 overflow-hidden shadow-lg",
      isLive 
        ? "border-indigo-500/40 bg-[#0c0d14] shadow-indigo-950/30 ring-1 ring-indigo-500/30" 
        : "border-indigo-500/20 bg-[#0e0f16]",
      isMaximized && "fixed inset-4 z-50 flex flex-col bg-[#0b0c12] border-indigo-500/50 shadow-2xl",
      className
    )}>
      {/* Header Principal */}
      <div className="px-4 py-3 bg-[#13141f] border-b border-indigo-500/15 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
          >
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all",
              isLive 
                ? "bg-indigo-600/30 border-indigo-400/50 text-indigo-300 animate-pulse shadow-sm shadow-indigo-500/20" 
                : "bg-indigo-500/20 border-indigo-500/30 text-indigo-400 group-hover:bg-indigo-500/30"
            )}>
              <ListTree className={cn("w-4 h-4", isLive && "animate-spin text-indigo-300")} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-100 group-hover:text-indigo-200 transition-colors">
                  {title}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-medium">
                  v2.4 AST Engine
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate">
                {subtitle || `${stats.total} nós computados • ${stats.thought} pensamentos CoT • ${stats.tools} ferramentas invocadas${stats.totalMs > 0 ? ` • ${stats.totalMs}ms` : ''}`}
              </p>
            </div>
          </button>
        </div>

        {/* Status e Controles Globais */}
        <div className="flex items-center gap-2 shrink-0">
          {isLive ? (
            <div className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Raciocinando...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Convergência Concluída</span>
            </div>
          )}

          <div className="flex items-center gap-1 border-l border-white/10 pl-2">
            <button
              type="button"
              onClick={handleDownloadLog}
              className="p-1.5 rounded-md text-gray-400 hover:text-indigo-300 hover:bg-white/5 transition-colors cursor-pointer"
              title="Exportar árvore e logs do Harness (JSON)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-md text-gray-400 hover:text-indigo-300 hover:bg-white/5 transition-colors cursor-pointer"
              title={isMaximized ? "Restaurar visualização" : "Maximizar visualização"}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 rounded-md text-gray-400 hover:text-indigo-300 hover:bg-white/5 transition-colors cursor-pointer"
              aria-label={isOpen ? "Ocultar painel" : "Expandir painel"}
            >
              {isOpen ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Expandido do Painel */}
      {isOpen && (
        <div className={cn(
          "bg-[#090a0f] flex flex-col min-h-0",
          isMaximized ? "flex-1 overflow-hidden" : ""
        )}>
          {/* Barra de Modos de Visualização & Filtros */}
          <div className="px-3.5 py-2.5 bg-[#10111a] border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
            {/* Seletor de Modo de Visualização */}
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md font-medium transition-all cursor-pointer",
                  viewMode === 'tree'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                )}
              >
                <GitBranch className="w-3 h-3" />
                <span>Árvore de Decisão</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md font-medium transition-all cursor-pointer",
                  viewMode === 'timeline'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                )}
              >
                <Activity className="w-3 h-3" />
                <span>Timeline Linear</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('tools')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md font-medium transition-all cursor-pointer",
                  viewMode === 'tools'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                )}
              >
                <Wrench className="w-3 h-3" />
                <span>Matriz de Ferramentas ({stats.tools})</span>
              </button>
            </div>

            {/* Busca & Filtros Rápidos */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3 h-3 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar pensamentos, nós ou tools..."
                  className="bg-black/50 border border-white/10 rounded-md pl-7 pr-2.5 py-1 text-[11px] text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 w-44 md:w-56"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={expandAll}
                  className="text-gray-400 hover:text-indigo-300 underline cursor-pointer text-[10px]"
                >
                  Expandir Tudo
                </button>
                <span className="text-gray-600">•</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="text-gray-400 hover:text-indigo-300 underline cursor-pointer text-[10px]"
                >
                  Recolher
                </button>
              </div>
            </div>
          </div>

          {/* Área Principal de Renderização */}
          <div className={cn(
            "p-3.5 overflow-y-auto space-y-3",
            isMaximized ? "flex-1 max-h-none" : "max-h-[460px]"
          )}>
            {/* 1. MODO ÁRVORE DE DECISÃO */}
            {viewMode === 'tree' && (
              <div className="space-y-3">
                {reasoningTree.map((rootNode) => (
                  <TreeBranchNode
                    key={rootNode.id}
                    node={rootNode}
                    isExpanded={expandedNodes[rootNode.id] ?? true}
                    onToggle={() => toggleNode(rootNode.id)}
                    expandedMap={expandedNodes}
                    onToggleSubNode={toggleNode}
                    onCopyText={handleCopyText}
                    copiedId={copiedId}
                    isLive={isLive}
                    onApplyPatch={onApplyPatch}
                  />
                ))}
              </div>
            )}

            {/* 2. MODO TIMELINE LINEAR */}
            {viewMode === 'timeline' && (
              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-indigo-500/20">
                {filteredTraces.map((t, idx) => {
                  const nodeId = `node-${idx}`;
                  const isNodeExpanded = expandedNodes[nodeId] ?? true;

                  return (
                    <div key={idx} className="relative group">
                      {/* Timeline Dot */}
                      <div className={cn(
                        "absolute -left-6 top-2 w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold z-10 transition-all",
                        t.type === 'plan' && "bg-blue-900/80 border-blue-400 text-blue-200",
                        t.type === 'thought' && "bg-purple-900/80 border-purple-400 text-purple-200",
                        t.type === 'tool_call' && "bg-amber-900/80 border-amber-400 text-amber-200",
                        t.type === 'tool_result' && "bg-emerald-900/80 border-emerald-400 text-emerald-200",
                        t.type === 'final_output' && "bg-indigo-900/80 border-indigo-400 text-indigo-200"
                      )}>
                        {idx + 1}
                      </div>

                      {/* Card do Passo */}
                      <div className={cn(
                        "rounded-lg border bg-[#11121b] overflow-hidden transition-all",
                        t.type === 'plan' && "border-blue-500/20 hover:border-blue-500/40",
                        t.type === 'thought' && "border-purple-500/20 hover:border-purple-500/40",
                        t.type === 'tool_call' && "border-amber-500/20 hover:border-amber-500/40",
                        t.type === 'tool_result' && "border-emerald-500/20 hover:border-emerald-500/40",
                        t.type === 'final_output' && "border-indigo-500/30 hover:border-indigo-500/50"
                      )}>
                        <div 
                          onClick={() => toggleNode(nodeId)}
                          className="px-3 py-2 flex items-center justify-between gap-2 cursor-pointer select-none bg-white/[0.02] hover:bg-white/[0.04] border-b border-white/5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                              t.type === 'plan' && "bg-blue-500/10 text-blue-300",
                              t.type === 'thought' && "bg-purple-500/10 text-purple-300",
                              t.type === 'tool_call' && "bg-amber-500/10 text-amber-300",
                              t.type === 'tool_result' && "bg-emerald-500/10 text-emerald-300",
                              t.type === 'final_output' && "bg-indigo-500/10 text-indigo-300"
                            )}>
                              {t.type === 'plan' && '🎯 Plano de Análise'}
                              {t.type === 'thought' && '🧠 Raciocínio (CoT)'}
                              {t.type === 'tool_call' && `🛠️ Invocação: ${t.toolName || 'Tool'}`}
                              {t.type === 'tool_result' && `👁️ Observação: ${t.toolName || 'Tool'}`}
                              {t.type === 'final_output' && '✅ Síntese Final'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-gray-400">
                            {t.durationMs !== undefined && (
                              <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {t.durationMs}ms
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(t.content, nodeId);
                              }}
                              className="p-1 rounded hover:text-white hover:bg-white/10"
                              title="Copiar texto deste passo"
                            >
                              {copiedId === nodeId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                            {isNodeExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </div>

                        {isNodeExpanded && (
                          <div className="p-3 text-xs space-y-2 font-mono">
                            <div className="text-gray-200 whitespace-pre-wrap break-words leading-relaxed font-sans text-[11px]">
                              {t.content}
                            </div>

                            {t.toolArgs && (
                              <div className="rounded bg-black/50 p-2.5 border border-amber-500/20 text-[10px]">
                                <div className="text-amber-300 font-semibold mb-1">Argumentos da Ferramenta ({t.toolName}):</div>
                                <pre className="text-amber-200/90 overflow-x-auto">{JSON.stringify(t.toolArgs, null, 2)}</pre>
                              </div>
                            )}

                            {t.toolResult && (
                              <div className="rounded bg-black/50 p-2.5 border border-emerald-500/20 text-[10px]">
                                <div className="text-emerald-300 font-semibold mb-1">Resultado Observado:</div>
                                <pre className="text-emerald-200/90 overflow-x-auto max-h-36">
                                  {typeof t.toolResult === 'object' ? JSON.stringify(t.toolResult, null, 2) : String(t.toolResult)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. MODO MATRIZ DE FERRAMENTAS & PATCHES */}
            {viewMode === 'tools' && (
              <div className="space-y-4">
                {/* Ferramentas Disparadas */}
                <div className="rounded-xl border border-white/10 bg-[#11121a] p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
                      <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      <span>Plugins & Ferramentas AST Invocadas ({toolsUsed.length})</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                      Tool Registry
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {toolsUsed.map((toolName, idx) => {
                      const invocations = traces.filter(t => t.type === 'tool_call' && t.toolName === toolName);
                      return (
                        <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-amber-500/20 space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono text-amber-300 font-bold">
                            <span>{toolName}</span>
                            <span className="text-[10px] text-gray-400">{invocations.length}x invocada</span>
                          </div>
                          <p className="text-[10px] text-gray-400">
                            {toolName === 'tool_scan_ast' && 'Varredura de AST de segurança e segredos expostos.'}
                            {toolName === 'tool_inspect_file' && 'Inspeção cirúrgica de linhas e fluxo de dados.'}
                            {toolName === 'tool_search_codebase' && 'Busca semântica e regex no repositório.'}
                            {toolName === 'tool_generate_patch' && 'Geração de diffs defensivos e mitigação cirúrgica.'}
                            {toolName === 'tool_verify_patch' && 'Auto-verificação de AST pós-modificação.'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Patches Sintetizados e Verificados */}
                {generatedPatches && generatedPatches.length > 0 && (
                  <div className="rounded-xl border border-emerald-500/30 bg-[#0d1612] p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Patches de Remediação Sintetizados ({generatedPatches.length})</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        100% AST Validated
                      </span>
                    </div>

                    <div className="space-y-2">
                      {generatedPatches.map((patch, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-black/60 border border-emerald-500/20 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                            <div className="flex items-center gap-1.5 font-mono text-emerald-300 font-bold">
                              <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{patch.filePath}</span>
                            </div>
                            {patch.ruleId && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20 font-bold">
                                Regra: {patch.ruleId}
                              </span>
                            )}
                          </div>

                          <div className="max-h-36 overflow-y-auto rounded bg-[#090909] p-2 text-[10px] font-mono text-emerald-200/80 border border-white/5">
                            <pre>{patch.diff}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rodapé com Resumo de Auditoria & Heurísticas */}
          <div className="px-4 py-2 bg-[#0e0f18] border-t border-indigo-500/10 flex items-center justify-between text-[11px] text-gray-400 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-indigo-300">
                <BrainCircuit className="w-3 h-3 text-indigo-400" />
                <span>Mitigar Engine</span>
              </span>
              <span className="hidden sm:inline text-gray-600">•</span>
              <span className="hidden sm:inline">
                Taxa de Sucesso de Dedução: <strong className="text-emerald-300">100%</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded border border-white/5 text-gray-400">
                {stats.total} Passos • {stats.tools} Tools • {stats.totalMs}ms
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Componente Recursivo de Ramo de Árvore (Tree Branch Node)
 */
interface TreeBranchNodeProps {
  node: TreeNode;
  isExpanded: boolean;
  onToggle: () => void;
  expandedMap: Record<string, boolean>;
  onToggleSubNode: (id: string) => void;
  onCopyText: (text: string, id: string) => void;
  copiedId: string | null;
  isLive: boolean;
  onApplyPatch?: (filePath: string, diff: string) => void;
}

const TreeBranchNode = ({
  node,
  isExpanded,
  onToggle,
  expandedMap,
  onToggleSubNode,
  onCopyText,
  copiedId,
  isLive,
  onApplyPatch,
}: TreeBranchNodeProps) => {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="relative font-mono text-xs">
      {/* Nó Principal do Ramo */}
      <div className={cn(
        "rounded-xl border transition-all overflow-hidden",
        node.type === 'plan' && "bg-[#101422] border-blue-500/30 hover:border-blue-500/50",
        node.type === 'thought' && "bg-[#14101e] border-purple-500/30 hover:border-purple-500/50",
        node.type === 'tool_call' && "bg-[#18130a] border-amber-500/30 hover:border-amber-500/50",
        node.type === 'tool_result' && "bg-[#0b1612] border-emerald-500/30 hover:border-emerald-500/50",
        node.type === 'final_output' && "bg-[#101326] border-indigo-500/40 hover:border-indigo-500/60 shadow-md"
      )}>
        {/* Cabeçalho do Nó */}
        <div 
          onClick={onToggle}
          className="px-3.5 py-2.5 flex items-center justify-between gap-2.5 cursor-pointer select-none bg-white/[0.02] hover:bg-white/[0.05] border-b border-white/5"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Ícone de Expansão */}
            <div className="text-gray-400 hover:text-white">
              {hasChildren ? (
                isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-indigo-400" /> : <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <div className="w-3.5 h-3.5 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60" />
                </div>
              )}
            </div>

            {/* Badge de Tipo */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0",
                node.type === 'plan' && "bg-blue-500/20 text-blue-300 border border-blue-500/30",
                node.type === 'thought' && "bg-purple-500/20 text-purple-300 border border-purple-500/30",
                node.type === 'tool_call' && "bg-amber-500/20 text-amber-300 border border-amber-500/30",
                node.type === 'tool_result' && "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                node.type === 'final_output' && "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
              )}>
                {node.type === 'plan' && <Layers className="w-2.5 h-2.5 text-blue-400" />}
                {node.type === 'thought' && <BrainCircuit className="w-2.5 h-2.5 text-purple-400" />}
                {node.type === 'tool_call' && <Wrench className="w-2.5 h-2.5 text-amber-400" />}
                {node.type === 'tool_result' && <Eye className="w-2.5 h-2.5 text-emerald-400" />}
                {node.type === 'final_output' && <CheckCircle2 className="w-2.5 h-2.5 text-indigo-400" />}
                <span>{node.title}</span>
              </span>

              {hasChildren && (
                <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded font-mono">
                  {node.children.length} {node.children.length === 1 ? 'sub-nó' : 'sub-nós'}
                </span>
              )}
            </div>
          </div>

          {/* Duração & Ações */}
          <div className="flex items-center gap-2 shrink-0">
            {node.durationMs !== undefined && (
              <span className="text-[10px] text-gray-400 font-mono flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5 text-indigo-400" />
                {node.durationMs}ms
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopyText(node.content, node.id);
              }}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10"
              title="Copiar texto deste nó"
            >
              {copiedId === node.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Corpo do Nó */}
        {isExpanded && (
          <div className="p-3.5 space-y-2.5 bg-black/20 text-xs">
            <div className="text-gray-200 whitespace-pre-wrap break-words leading-relaxed font-sans text-[11px]">
              {node.content}
            </div>

            {/* Parâmetros de Ferramenta */}
            {node.toolArgs && Object.keys(node.toolArgs).length > 0 && (
              <div className="rounded-lg bg-black/60 border border-amber-500/20 overflow-hidden">
                <div className="px-2.5 py-1 bg-amber-500/10 text-amber-300 text-[10px] font-semibold border-b border-amber-500/20 flex items-center justify-between">
                  <span>Parâmetros da Ferramenta ({node.toolName})</span>
                  <span className="text-[9px] text-amber-400/70">AST Invocation</span>
                </div>
                <div className="p-2 text-[10px] text-amber-200/90 font-mono overflow-x-auto">
                  <pre>{JSON.stringify(node.toolArgs, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Retorno Observado */}
            {node.toolResult && (
              <div className="rounded-lg bg-black/60 border border-emerald-500/20 overflow-hidden">
                <div className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 text-[10px] font-semibold border-b border-emerald-500/20 flex items-center justify-between">
                  <span>Resultado Observado no AST</span>
                  <span className="text-[9px] text-emerald-400/70">Tool Output</span>
                </div>
                <div className="p-2 text-[10px] text-emerald-200/90 font-mono overflow-x-auto max-h-40">
                  <pre>{typeof node.toolResult === 'object' ? JSON.stringify(node.toolResult, null, 2) : String(node.toolResult)}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Renderização de Sub-Galhos Filhos (Hierarquia de Árvore) */}
      {hasChildren && isExpanded && (
        <div className="mt-2 pl-4 ml-3 border-l-2 border-indigo-500/30 space-y-2">
          {node.children.map((childNode) => (
            <TreeBranchNode
              key={childNode.id}
              node={childNode}
              isExpanded={expandedMap[childNode.id] ?? true}
              onToggle={() => onToggleSubNode(childNode.id)}
              expandedMap={expandedMap}
              onToggleSubNode={onToggleSubNode}
              onCopyText={onCopyText}
              copiedId={copiedId}
              isLive={isLive}
              onApplyPatch={onApplyPatch}
            />
          ))}
        </div>
      )}
    </div>
  );
};
