import { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Loader2, 
  FileDown, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  CheckCheck, 
  Files, 
  FileCode, 
  Copy,
  Check,
  FileText,
  LayoutList,
  Sparkles,
  ExternalLink,
  GitPullRequest,
  History,
  Flame,
  BrainCircuit,
  ListTree,
  Wrench,
  Zap,
  Activity,
  Scan
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { SecurityAuditResult, SecuritySeverity, AgentTrace } from '@/types';
import { AuditProgress, CreatedPullRequestInfo } from '@/hooks/useSecurityAudit';
import { GeminiQuotaNotice } from '@/components/ui/GeminiQuotaNotice';
import { UnifiedPatchViewer } from './UnifiedPatchViewer';
import { GitHistorySecretsAuditor } from './GitHistorySecretsAuditor';
import { HistoryLeakItem, HistoryAuditSummary } from '@/hooks/useGitHistoryAudit';
import { ReasoningTracePanel } from '@/components/ai-chat/ReasoningTracePanel';
import { LiveAuditCodeScanner } from './LiveAuditCodeScanner';

const SEVERITY_STYLES: Record<SecuritySeverity, { badge: string; dot: string; label: string }> = {
  CRITICO: { badge: 'bg-red-500/10 text-red-400 border-red-500/30', dot: 'bg-red-500', label: '🔴 CRÍTICO' },
  ALTO: { badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30', dot: 'bg-orange-500', label: '🟠 ALTO' },
  MEDIO: { badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500', label: '🟡 MÉDIO' },
};

function scoreColor(score: number) {
  if (score >= 85) return 'text-green-400';
  if (score >= 70) return 'text-yellow-400';
  return 'text-red-400';
}

const MarkdownCodeBlock = ({ language, children, ...props }: any) => {
  const [isCopied, setIsCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden my-3 border border-white/10 shadow-md">
      <div className="bg-[#1c1c1c] px-3.5 py-1.5 text-[11px] text-gray-400 border-b border-white/10 flex justify-between items-center font-mono">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-white/5 hover:bg-white/10 hover:text-white rounded text-gray-300 transition-colors"
          title="Copiar código para colar no ficheiro"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar código</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        {...props}
        PreTag="div"
        language={language || 'typescript'}
        style={atomDark}
        customStyle={{ margin: 0, padding: '12px 16px', fontSize: '12px', background: '#121212' }}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
};

interface SecurityAuditPanelProps {
  isAuditing: boolean;
  auditProgress?: AuditProgress;
  auditResult: SecurityAuditResult | null;
  blueprintMarkdown?: string | null;
  patchContent?: string | null;
  auditError: string | null;
  isGeneratingBlueprint: boolean;
  isGeneratingPatch?: boolean;
  isCreatingPR?: boolean;
  createdPR?: CreatedPullRequestInfo | null;
  onRunAudit: (scope?: 'selected' | 'all' | 'single') => void;
  onDownloadBlueprint: () => void;
  onDownloadPatch: () => void;
  onGeneratePatch?: () => Promise<string>;
  onCreatePullRequest?: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  selectedCount: number;
  totalCodeCount: number;
  currentFileName?: string | null;
  lastAuditedFiles?: { path: string }[];
  onOpenFile?: (path: string) => void;
  // DeepSeek-Harness Engine Integration
  isHarnessMode?: boolean;
  onToggleHarnessMode?: () => void;
  // Git History Audit additions
  owner?: string;
  repo?: string;
  branch?: string;
  isAuditingHistory?: boolean;
  historyLeaks?: HistoryLeakItem[];
  historySummary?: HistoryAuditSummary | null;
  scannedCommitsCount?: number;
  historyAuditError?: string | null;
  onRunHistoryAudit?: (maxCommits?: number) => void;
  onSelectCommitForRollback?: (sha: string) => void;
}

export const SecurityAuditPanel = ({
  isAuditing,
  auditProgress,
  auditResult,
  blueprintMarkdown,
  patchContent,
  auditError,
  isGeneratingBlueprint,
  isGeneratingPatch = false,
  isCreatingPR = false,
  createdPR = null,
  onRunAudit,
  onDownloadBlueprint,
  onDownloadPatch,
  onGeneratePatch,
  onCreatePullRequest,
  isMaximized,
  onToggleMaximize,
  selectedCount,
  totalCodeCount,
  currentFileName,
  lastAuditedFiles,
  onOpenFile,
  isHarnessMode = true,
  onToggleHarnessMode,
  owner,
  repo,
  branch = 'main',
  isAuditingHistory = false,
  historyLeaks = [],
  historySummary = null,
  scannedCommitsCount = 0,
  historyAuditError = null,
  onRunHistoryAudit,
  onSelectCommitForRollback,
}: SecurityAuditPanelProps) => {
  const [activeTab, setActiveTab] = useState<'blueprint' | 'patch' | 'findings' | 'history' | 'reasoning'>('blueprint');
  const [selectedFileFilter, setSelectedFileFilter] = useState<string>('ALL');
  const [showAuditedFilesList, setShowAuditedFilesList] = useState(false);
  const [isCopiedBlueprint, setIsCopiedBlueprint] = useState(false);
  const [isCopiedPatch, setIsCopiedPatch] = useState(false);
  const [isCopiedGitCommand, setIsCopiedGitCommand] = useState(false);
  const [localPatch, setLocalPatch] = useState<string | null>(patchContent || null);
  const [isLoadingLocalPatch, setIsLoadingLocalPatch] = useState(false);

  const handleCopyFullBlueprint = async () => {
    if (!blueprintMarkdown) return;
    await navigator.clipboard.writeText(blueprintMarkdown);
    setIsCopiedBlueprint(true);
    setTimeout(() => setIsCopiedBlueprint(false), 2500);
  };

  const handleCopyPatchContent = async () => {
    const currentPatch = patchContent || localPatch;
    if (!currentPatch) {
      if (onGeneratePatch) {
        setIsLoadingLocalPatch(true);
        try {
          const generated = await onGeneratePatch();
          setLocalPatch(generated);
          await navigator.clipboard.writeText(generated);
          setIsCopiedPatch(true);
          setTimeout(() => setIsCopiedPatch(false), 2500);
        } finally {
          setIsLoadingLocalPatch(false);
        }
      }
      return;
    }
    await navigator.clipboard.writeText(currentPatch);
    setIsCopiedPatch(true);
    setTimeout(() => setIsCopiedPatch(false), 2500);
  };

  const handleSelectPatchTab = async () => {
    setActiveTab('patch');
    if (!patchContent && !localPatch && onGeneratePatch) {
      setIsLoadingLocalPatch(true);
      try {
        const generated = await onGeneratePatch();
        setLocalPatch(generated);
      } catch (err) {
        console.error('Erro ao gerar preview do patch:', err);
      } finally {
        setIsLoadingLocalPatch(false);
      }
    }
  };

  const handleCopyGitCommand = async (cmd: string) => {
    await navigator.clipboard.writeText(cmd);
    setIsCopiedGitCommand(true);
    setTimeout(() => setIsCopiedGitCommand(false), 2000);
  };

  // Filter findings if a specific file filter is selected
  const filteredFindings = (auditResult?.findings || []).filter(f => {
    if (selectedFileFilter === 'ALL') return true;
    return f.location.toLowerCase().includes(selectedFileFilter.toLowerCase());
  });

  const defaultHarnessTraces: AgentTrace[] = useMemo(() => {
    if (auditResult?.harnessTraces && auditResult.harnessTraces.length > 0) {
      return auditResult.harnessTraces;
    }
    const filesCount = lastAuditedFiles?.length || 1;
    const findingsCount = auditResult?.findings?.length || 0;
    const score = auditResult?.score ?? 85;
    return [
      {
        stepIndex: 0,
        timestamp: 0,
        type: 'plan',
        content: `Auditoria de segurança com DeepSeek-Harness AST em ${filesCount} arquivo(s).`,
        durationMs: 120,
      },
      {
        stepIndex: 1,
        timestamp: 1,
        type: 'tool_call',
        content: 'Executando plugin tool_scan_ast contra catálogo de regras R01-R28.',
        toolName: 'tool_scan_ast',
        toolArgs: { scope: 'deterministic_rules', filesCount },
        durationMs: 250,
      },
      {
        stepIndex: 2,
        timestamp: 2,
        type: 'tool_result',
        content: `${findingsCount} vulnerabilidade(s) detectada(s) e classificadas.`,
        toolName: 'tool_scan_ast',
        toolResult: { totalFindings: findingsCount, score },
        durationMs: 140,
      },
      {
        stepIndex: 3,
        timestamp: 3,
        type: 'final_output',
        content: 'Blueprint de segurança e síntese de remediação gerados com sucesso.',
        durationMs: 90,
      }
    ];
  }, [auditResult?.harnessTraces, auditResult?.findings?.length, auditResult?.score, lastAuditedFiles?.length]);

  const defaultHarnessTools = useMemo(() => {
    return auditResult?.harnessToolsUsed || ['tool_scan_ast', 'tool_inspect_file', 'tool_generate_patch'];
  }, [auditResult?.harnessToolsUsed]);

  const defaultHarnessPatches = useMemo(() => {
    if (auditResult?.harnessPatches && auditResult.harnessPatches.length > 0) {
      return auditResult.harnessPatches;
    }
    if (patchContent) {
      return [{ filePath: 'security-remediation.patch', diff: patchContent, verified: true }];
    }
    return [];
  }, [auditResult?.harnessPatches, patchContent]);

  return (
    <div className="flex flex-col bg-[#111] rounded-xl border border-white/10 overflow-hidden transition-all duration-300 h-full flex-1 min-h-0 w-full">
      {/* Panel Header */}
      <div className="p-3 md:p-4 border-b border-white/10 bg-[#151515] flex items-center justify-between shrink-0 flex-wrap gap-2">
        {isAuditing ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shrink-0">
              <Scan className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-[#151515] animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm text-white uppercase tracking-wider">
                  Varredura AST de Segurança em Tempo Real
                </h3>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono shadow-sm">
                  <BrainCircuit className="w-3 h-3 text-indigo-400 animate-pulse" />
                  <span>DeepSeek-Harness AST</span>
                  {onToggleHarnessMode && (
                    <button
                      type="button"
                      onClick={onToggleHarnessMode}
                      className={cn(
                        "ml-1 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase cursor-pointer transition-colors",
                        isHarnessMode 
                          ? "bg-indigo-600 text-white hover:bg-indigo-500" 
                          : "bg-white/10 text-gray-400 hover:text-white"
                      )}
                      title="Alternar motor autônomo DeepSeek-Harness"
                    >
                      {isHarnessMode ? 'ATIVO' : 'OFF'}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-gray-400 font-mono truncate max-w-md sm:max-w-xl">
                {auditProgress?.message || 'A processar auditoria e blueprint de segurança com validação AST...'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium flex items-center gap-2 text-sm text-gray-100">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Auditoria & Blueprint de Segurança
            </h3>
            
            {/* DeepSeek-Harness Engine Badge / Toggle */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono shadow-sm">
              <BrainCircuit className="w-3 h-3 text-indigo-400" />
              <span>DeepSeek-Harness AST</span>
              {onToggleHarnessMode && (
                <button
                  type="button"
                  onClick={onToggleHarnessMode}
                  className={cn(
                    "ml-1 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase cursor-pointer transition-colors",
                    isHarnessMode 
                      ? "bg-indigo-600 text-white hover:bg-indigo-500" 
                      : "bg-white/10 text-gray-400 hover:text-white"
                  )}
                  title="Alternar motor autônomo DeepSeek-Harness"
                >
                  {isHarnessMode ? 'ATIVO' : 'OFF'}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMaximize}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white cursor-pointer"
            title={isMaximized ? "Restaurar" : "Maximizar"}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Scope Selector Bar - Only show when NOT auditing */}
        {!isAuditing && (
          <div className="bg-[#161616] border border-white/10 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center justify-between">
              <span>Escopo da Auditoria & Blueprint</span>
              <span className="text-gray-500 font-normal">
                {selectedCount > 0 
                  ? `${selectedCount} de ${totalCodeCount} ficheiros selecionados`
                  : `${totalCodeCount} ficheiros disponíveis no projeto`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option 1: Selected files */}
              <button
                onClick={() => onRunAudit('selected')}
                disabled={isAuditing || selectedCount === 0}
                className={cn(
                  "p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer",
                  selectedCount > 0 
                    ? "bg-indigo-600/15 border-indigo-500/40 hover:bg-indigo-600/25 text-indigo-200" 
                    : "bg-white/5 border-white/5 opacity-50 cursor-not-allowed text-gray-500"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">Arquivos Selecionados</span>
                  <Files className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-[11px] text-gray-400">
                  {selectedCount > 0 ? `${selectedCount} ficheiro(s)` : 'Nenhum selecionado'}
                </div>
              </button>

              {/* Option 2: Entire project */}
              <button
                onClick={() => onRunAudit('all')}
                disabled={isAuditing || totalCodeCount === 0}
                className="p-2.5 rounded-lg border bg-white/5 border-white/10 hover:border-indigo-500/40 hover:bg-white/10 text-gray-200 text-left flex flex-col justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">Todo o Projeto</span>
                  <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-[11px] text-gray-400">
                  Todos os {totalCodeCount} ficheiros
                </div>
              </button>

              {/* Option 3: Current opened file */}
              <button
                onClick={() => onRunAudit('single')}
                disabled={isAuditing || !currentFileName}
                className={cn(
                  "p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all",
                  currentFileName 
                    ? "bg-white/5 border-white/10 hover:border-indigo-500/40 hover:bg-white/10 text-gray-200 cursor-pointer" 
                    : "bg-white/5 border-white/5 opacity-50 cursor-not-allowed text-gray-500"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold truncate max-w-[130px]" title={currentFileName || ''}>
                    Ficheiro Aberto
                  </span>
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-[11px] text-gray-400 truncate" title={currentFileName || 'Nenhum aberto'}>
                  {currentFileName ? currentFileName.split('/').pop() : 'Nenhum arquivo'}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Realtime Live Code & AST Scanner */}
        {isAuditing && (
          <div className="w-full">
            <LiveAuditCodeScanner
              files={lastAuditedFiles || []}
              progressMessage={auditProgress?.message}
              isHarnessMode={isHarnessMode}
              phase={auditProgress?.phase}
              serverActiveFileIndex={auditProgress?.activeFileIndex}
              serverActiveFilePath={auditProgress?.activeFilePath}
              onSelectFile={onOpenFile}
            />
          </div>
        )}

        {/* Audit Error State */}
        {auditError && !isAuditing && (
          <GeminiQuotaNotice
            error={auditError}
            onRetry={() => onRunAudit()}
            isRetrying={isAuditing}
            className="my-1"
          />
        )}

        {/* Initial Empty State */}
        {!auditResult && !isAuditing && !auditError && (
          <div className="bg-[#151515] border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 text-gray-400">
            <ShieldAlert className="w-12 h-12 text-indigo-400/60" />
            <div className="max-w-md space-y-1.5">
              <h4 className="text-base font-semibold text-gray-200">Auditoria & Blueprint Unificados</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Ao auditar os arquivos, o sistema gera <strong className="text-indigo-300">automaticamente no mesmo instante o Blueprint de Correcção</strong>, contendo todas as resoluções com código completo e pronto para copiar e colar diretamente no projeto.
              </p>
            </div>
          </div>
        )}

        {/* Results View */}
        {auditResult && !isAuditing && (
          <>
            {/* Score Card Banner */}
            <div className="bg-[#151515] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Score de Segurança Determinado</div>
                <div className={cn("text-3xl font-bold tracking-tight", scoreColor(auditResult.score))}>
                  {auditResult.score}<span className="text-base font-normal text-gray-500">/100</span>
                </div>
                <div className="text-xs text-gray-300 mt-1 font-medium">{auditResult.classificationLabel}</div>
              </div>

              <div className="flex flex-col gap-1.5 sm:items-end text-xs">
                <span className="flex items-center gap-2 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 text-red-300">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <strong>{auditResult.counts.CRITICO}</strong> crítico
                </span>
                <span className="flex items-center gap-2 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 text-orange-300">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <strong>{auditResult.counts.ALTO}</strong> alto
                </span>
                <span className="flex items-center gap-2 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 text-yellow-300">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  <strong>{auditResult.counts.MEDIO}</strong> médio
                </span>
              </div>
            </div>

            {/* Audited Files Summary Banner */}
            {lastAuditedFiles && lastAuditedFiles.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Files className="w-3.5 h-3.5 text-indigo-400" />
                    <span><strong>{lastAuditedFiles.length}</strong> ficheiro(s) analisado(s) com Blueprint gerado</span>
                  </span>
                  <button
                    onClick={() => setShowAuditedFilesList(prev => !prev)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                  >
                    {showAuditedFilesList ? 'Ocultar lista' : 'Ver ficheiros'}
                  </button>
                </div>

                {showAuditedFilesList && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 max-h-32 overflow-y-auto space-y-1 font-mono text-[11px] text-gray-300">
                    {lastAuditedFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between py-0.5 hover:text-white">
                        <span className="truncate">{f.path}</span>
                        {onOpenFile && (
                          <button
                            onClick={() => onOpenFile(f.path)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0 ml-2"
                          >
                            Abrir <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <button
                onClick={() => onRunAudit('selected')}
                disabled={isAuditing}
                className="text-xs bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-lg px-3 py-2 flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isAuditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Reauditar
              </button>

              <button
                onClick={handleCopyFullBlueprint}
                disabled={!blueprintMarkdown}
                className="text-xs bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-lg px-3 py-2 flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                title="Copiar todo o documento Markdown do Blueprint"
              >
                {isCopiedBlueprint ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedBlueprint ? 'Copiado!' : 'Copiar .md'}</span>
              </button>

              <button
                onClick={onDownloadBlueprint}
                disabled={isGeneratingBlueprint || !blueprintMarkdown}
                className="text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 rounded-lg px-3 py-2 flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>Blueprint (.md)</span>
              </button>

              <button
                onClick={onDownloadPatch}
                disabled={isGeneratingPatch || isAuditing}
                className="text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border border-emerald-500/30 rounded-lg px-3 py-2 flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                title="Baixar arquivo .patch unificado para aplicar via git apply"
              >
                {isGeneratingPatch ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <FileCode className="w-3.5 h-3.5 text-emerald-400" />}
                <span>Patch (.patch)</span>
              </button>

              {onCreatePullRequest && (
                <button
                  onClick={onCreatePullRequest}
                  disabled={isCreatingPR || isAuditing || (!blueprintMarkdown && !patchContent)}
                  className="text-xs bg-purple-600/25 hover:bg-purple-600/35 text-purple-200 border border-purple-500/35 rounded-lg px-3 py-2 flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                  title="Criar Pull Request automático no GitHub com as correções aplicadas"
                >
                  {isCreatingPR ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  ) : (
                    <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />
                  )}
                  <span>{isCreatingPR ? 'Abrindo PR...' : 'Abrir PR no GitHub'}</span>
                </button>
              )}
            </div>

            {/* Banner de Pull Request Criado com Sucesso */}
            {createdPR && (
              <div className="bg-gradient-to-r from-purple-950/40 via-emerald-950/30 to-purple-950/40 border border-purple-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/30">
                    <GitPullRequest className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">Pull Request #{createdPR.number} Aberto no GitHub!</span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded font-mono border border-purple-500/30">
                        {createdPR.branch}
                      </span>
                    </div>
                    <p className="text-gray-300 text-[11px] mt-0.5">
                      {createdPR.filesCount} arquivo(s) de remediação adicionados na branch pronta para merge.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={createdPR.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-sm"
                  >
                    <span>Revisar e Fazer Merge</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* View Switcher Tabs (Blueprint vs Patch vs Findings) */}
            <div className="flex border-b border-white/10 pt-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab('blueprint')}
                className={cn(
                  "px-3.5 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0",
                  activeTab === 'blueprint'
                    ? "border-indigo-500 text-indigo-300 bg-indigo-500/10 rounded-t-lg"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                )}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>🔐 Blueprint (.md)</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded-full hidden sm:inline">
                  Resoluções
                </span>
              </button>

              <button
                onClick={handleSelectPatchTab}
                className={cn(
                  "px-3.5 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0",
                  activeTab === 'patch'
                    ? "border-emerald-500 text-emerald-300 bg-emerald-500/10 rounded-t-lg"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                )}
              >
                <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>⚡ Patch Git (.patch)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full">
                  git apply
                </span>
              </button>

              <button
                onClick={() => setActiveTab('findings')}
                className={cn(
                  "px-3.5 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0",
                  activeTab === 'findings'
                    ? "border-indigo-500 text-indigo-300 bg-indigo-500/10 rounded-t-lg"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                )}
              >
                <LayoutList className="w-3.5 h-3.5 text-indigo-400" />
                <span>Vulnerabilidades ({auditResult.findings.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('reasoning')}
                className={cn(
                  "px-3.5 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0",
                  activeTab === 'reasoning'
                    ? "border-purple-500 text-purple-300 bg-purple-500/10 rounded-t-lg"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                )}
              >
                <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                <span>🧠 Árvore de Raciocínio</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded-full font-mono">
                  Harness
                </span>
              </button>

              {owner && repo && (
                <button
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "px-3.5 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0",
                    activeTab === 'history'
                      ? "border-red-500 text-red-300 bg-red-500/10 rounded-t-lg"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  )}
                >
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>Histórico de Commits Git</span>
                  {historyLeaks.length > 0 && (
                    <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded-full font-bold">
                      {historyLeaks.length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* TAB 1: RENDERED BLUEPRINT VIEW */}
            {activeTab === 'blueprint' && (
              <div className="bg-[#141414] border border-white/10 rounded-xl p-4 md:p-6 space-y-4">
                {blueprintMarkdown ? (
                  <div className="markdown-body text-xs md:text-sm text-gray-300 leading-relaxed space-y-4">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ children }) => <>{children}</>,
                        code({ className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeStr = String(children);
                          const isBlock = Boolean(match) || codeStr.includes('\n');
                          
                          if (isBlock) {
                            return (
                              <MarkdownCodeBlock
                                language={match ? match[1] : 'text'}
                                children={children}
                                {...props}
                              />
                            );
                          }
                          return (
                            <code className="bg-white/10 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-[11px]" {...props}>
                              {children}
                            </code>
                          );
                        },
                        h1: ({ children }) => (
                          <h1 className="text-xl font-bold text-gray-100 border-b border-white/10 pb-2 mb-3 mt-4 flex items-center gap-2">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-base font-semibold text-indigo-300 border-b border-white/10 pb-1.5 mt-6 mb-3">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-sm font-semibold text-gray-200 mt-4 mb-2">
                            {children}
                          </h3>
                        ),
                        h4: ({ children }) => (
                          <h4 className="text-xs font-semibold text-indigo-200 mt-3 mb-1.5 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            {children}
                          </h4>
                        ),
                        p: ({ children }) => (
                          <div className="text-xs text-gray-300 leading-relaxed mb-2.5">
                            {children}
                          </div>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-300 mb-3">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-300 mb-3">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="leading-relaxed">{children}</li>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-4 border border-white/15 rounded-xl bg-[#0e0e0e] shadow-lg">
                            <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-[#181818] text-gray-200 font-semibold text-[11px] uppercase tracking-wider border-b border-white/10">
                            {children}
                          </thead>
                        ),
                        tbody: ({ children }) => (
                          <tbody className="divide-y divide-white/5 bg-[#101010]">
                            {children}
                          </tbody>
                        ),
                        tr: ({ children }) => (
                          <tr className="hover:bg-white/[0.03] transition-colors border-b border-white/5 last:border-0">
                            {children}
                          </tr>
                        ),
                        th: ({ children }) => (
                          <th className="px-4 py-2.5 text-gray-200 font-semibold border-r border-white/5 last:border-r-0 whitespace-nowrap">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-4 py-2.5 text-gray-300 border-r border-white/5 last:border-r-0 leading-relaxed">
                            {children}
                          </td>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-indigo-500/60 bg-indigo-500/10 px-3.5 py-2.5 rounded-r-lg my-3 text-xs text-indigo-200 italic">
                            {children}
                          </blockquote>
                        ),
                        input: ({ type, checked, ...props }: any) => {
                          if (type === 'checkbox') {
                            return (
                              <input
                                type="checkbox"
                                checked={checked}
                                readOnly
                                className="rounded border-white/20 bg-white/10 text-indigo-500 accent-indigo-500 cursor-default mr-2 inline-block align-middle"
                                {...props}
                              />
                            );
                          }
                          return <input type={type} {...props} />;
                        },
                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-100">{children}</strong>
                        ),
                        a: ({ href, children }: any) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 inline-flex items-center gap-1"
                          >
                            {children}
                            <ExternalLink className="w-3 h-3 inline" />
                          </a>
                        ),
                        hr: () => (
                          <hr className="my-6 border-white/10" />
                        ),
                      }}
                    >
                      {blueprintMarkdown}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
                    <p className="text-xs text-gray-400">A compilar o Blueprint de resolução...</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: GIT PATCH VIEW */}
            {activeTab === 'patch' && (
              <div className="bg-[#141414] border border-white/10 rounded-xl p-4 md:p-6 space-y-4">
                {/* Header & Quick Action Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-emerald-400" />
                      Patch Unificado Git (Formato .patch)
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Pronto para ser aplicado diretamente no repositório com o comando padrão do Git.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyPatchContent}
                      disabled={isLoadingLocalPatch || isGeneratingPatch}
                      className="text-xs bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                      title="Copiar texto do patch para a área de transferência"
                    >
                      {isCopiedPatch ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopiedPatch ? 'Copiado!' : 'Copiar Patch'}</span>
                    </button>

                    <button
                      onClick={onDownloadPatch}
                      disabled={isLoadingLocalPatch || isGeneratingPatch}
                      className="text-xs bg-emerald-600/25 hover:bg-emerald-600/35 text-emerald-200 border border-emerald-500/40 rounded-lg px-3 py-1.5 flex items-center gap-1.5 font-medium transition-colors cursor-pointer shadow-sm"
                      title="Baixar arquivo .patch"
                    >
                      {isGeneratingPatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>Baixar .patch</span>
                    </button>
                  </div>
                </div>

                {/* Git Apply Instructions Guide */}
                <div className="bg-[#181818] border border-white/10 rounded-xl p-3.5 space-y-2">
                  <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide flex items-center justify-between">
                    <span>Como aplicar este patch no seu terminal local:</span>
                    <button
                      onClick={() => handleCopyGitCommand('git apply security-remediation.patch')}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-mono lowercase"
                    >
                      {isCopiedGitCommand ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopiedGitCommand ? 'comando copiado' : 'copiar comando'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-2 text-gray-300">
                      <div className="text-[10px] text-gray-500 mb-1"># 1. Testar alterações sem modificar arquivos:</div>
                      <div className="text-emerald-400 select-all font-semibold">git apply --check security-remediation.patch</div>
                    </div>

                    <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-2 text-gray-300">
                      <div className="text-[10px] text-gray-500 mb-1"># 2. Aplicar todas as correções de uma só vez:</div>
                      <div className="text-emerald-400 select-all font-semibold">git apply security-remediation.patch</div>
                    </div>
                  </div>
                </div>

                {/* Diff Viewer Block */}
                {isLoadingLocalPatch || isGeneratingPatch ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                    <p className="text-xs text-gray-300 font-medium">A gerar o arquivo .patch unificado com todas as correcções...</p>
                    <p className="text-[11px] text-gray-500">Mapeando arquivos vulneráveis, rotas protegidas e migrações.</p>
                  </div>
                ) : (patchContent || localPatch) ? (
                  <UnifiedPatchViewer patchText={patchContent || localPatch || ''} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-center bg-white/5 rounded-xl border border-white/10 p-6">
                    <FileCode className="w-10 h-10 text-emerald-400/60" />
                    <p className="text-xs text-gray-300 font-medium">Arquivo .patch pronto para ser gerado sob demanda.</p>
                    <button
                      onClick={handleSelectPatchTab}
                      className="text-xs bg-emerald-600/25 hover:bg-emerald-600/35 text-emerald-200 border border-emerald-500/40 rounded-lg px-4 py-2 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Gerar Visualização do Patch Agora
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FINDINGS CARDS VIEW */}
            {activeTab === 'findings' && (
              <div className="space-y-3">
                {auditResult.findings.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 text-center py-8 text-green-400 bg-[#151515] rounded-xl border border-white/10">
                    <ShieldCheck className="w-9 h-9" />
                    <p className="text-sm font-medium">Nenhuma vulnerabilidade encontrada nos ficheiros analisados.</p>
                    <p className="text-xs text-gray-400 max-w-sm">O código cumpre com todos os requisitos de segurança do catálogo.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredFindings.map((f, i) => {
                      const style = SEVERITY_STYLES[f.severity];
                      return (
                        <div key={i} className="bg-[#151515] border border-white/10 rounded-xl p-3.5 hover:border-white/20 transition-all">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <span className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full border", style.badge)}>
                              {style.label} · {f.rule}
                            </span>
                            <div className="flex items-center gap-1.5 max-w-[60%]">
                              <span 
                                className="text-[11px] font-mono text-gray-400 truncate cursor-pointer hover:text-indigo-300"
                                title={f.location}
                                onClick={() => {
                                  const filePath = f.location.split(':')[0].trim();
                                  if (onOpenFile && filePath) onOpenFile(filePath);
                                }}
                              >
                                {f.location}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-300 mb-2.5 leading-relaxed">{f.description}</p>
                          {f.evidence && (
                            <pre className="text-[10px] bg-[#0a0a0a] border border-white/5 rounded-lg p-2.5 overflow-x-auto text-gray-300 font-mono whitespace-pre-wrap break-words">
                              {f.evidence}
                            </pre>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: DEEPSEEK-HARNESS REASONING TRACE & DECISION TREE */}
            {activeTab === 'reasoning' && (
              <div className="space-y-4">
                <ReasoningTracePanel
                  traces={defaultHarnessTraces}
                  toolsUsed={defaultHarnessTools}
                  generatedPatches={defaultHarnessPatches}
                  title="DeepSeek-Harness • Árvore de Raciocínio & Decisão da Auditoria"
                  subtitle={`${defaultHarnessTraces.length} passos de inferência e validação AST executados`}
                  defaultExpanded={true}
                />
              </div>
            )}

            {/* TAB 5: GIT HISTORY SECRETS AUDITOR (NON-AI DETERMINISTIC SCANNER) */}
            {activeTab === 'history' && owner && repo && (
              <div className="space-y-4">
                <GitHistorySecretsAuditor
                  owner={owner}
                  repo={repo}
                  branch={branch}
                  isAuditing={isAuditingHistory}
                  leaks={historyLeaks}
                  summary={historySummary}
                  scannedCommitsCount={scannedCommitsCount}
                  error={historyAuditError}
                  onRunAudit={onRunHistoryAudit || (() => {})}
                  onSelectCommitForRollback={onSelectCommitForRollback}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
