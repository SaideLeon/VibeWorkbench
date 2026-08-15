import { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { SecurityAuditResult, SecuritySeverity } from '@/types';
import { AuditProgress } from '@/hooks/useSecurityAudit';

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
  auditError: string | null;
  isGeneratingBlueprint: boolean;
  onRunAudit: (scope?: 'selected' | 'all' | 'single') => void;
  onDownloadBlueprint: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  selectedCount: number;
  totalCodeCount: number;
  currentFileName?: string | null;
  lastAuditedFiles?: { path: string }[];
  onOpenFile?: (path: string) => void;
}

export const SecurityAuditPanel = ({
  isAuditing,
  auditProgress,
  auditResult,
  blueprintMarkdown,
  auditError,
  isGeneratingBlueprint,
  onRunAudit,
  onDownloadBlueprint,
  isMaximized,
  onToggleMaximize,
  selectedCount,
  totalCodeCount,
  currentFileName,
  lastAuditedFiles,
  onOpenFile
}: SecurityAuditPanelProps) => {
  const [activeTab, setActiveTab] = useState<'blueprint' | 'findings'>('blueprint');
  const [selectedFileFilter, setSelectedFileFilter] = useState<string>('ALL');
  const [showAuditedFilesList, setShowAuditedFilesList] = useState(false);
  const [isCopiedBlueprint, setIsCopiedBlueprint] = useState(false);

  const handleCopyFullBlueprint = async () => {
    if (!blueprintMarkdown) return;
    await navigator.clipboard.writeText(blueprintMarkdown);
    setIsCopiedBlueprint(true);
    setTimeout(() => setIsCopiedBlueprint(false), 2500);
  };

  // Filter findings if a specific file filter is selected
  const filteredFindings = (auditResult?.findings || []).filter(f => {
    if (selectedFileFilter === 'ALL') return true;
    return f.location.toLowerCase().includes(selectedFileFilter.toLowerCase());
  });

  return (
    <div className={cn(
      "flex flex-col bg-[#111] rounded-xl border border-white/10 overflow-hidden transition-all duration-300",
      isMaximized ? "h-full" : "h-full lg:h-[600px]"
    )}>
      {/* Panel Header */}
      <div className="p-3 md:p-4 border-b border-white/10 bg-[#151515] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Auditoria & Blueprint de Segurança
          </h3>
          {isAuditing && (
            <span className="text-xs text-indigo-400 animate-pulse flex items-center gap-1.5 ml-2 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {auditProgress?.message || 'A processar auditoria e blueprint...'}
            </span>
          )}
        </div>
        <button
          onClick={onToggleMaximize}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          title={isMaximized ? "Restaurar" : "Maximizar"}
        >
          {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Scope Selector Bar */}
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

        {/* Loading Progress State */}
        {isAuditing && (
          <div className="bg-[#151515] border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-9 h-9 animate-spin text-indigo-400" />
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-200">
                {auditProgress?.message || 'A processar auditoria e blueprint de segurança...'}
              </p>
              <p className="text-xs text-gray-400 max-w-md">
                Avaliando vulnerabilidades determinísticas e gerando o Blueprint completo com código de resolução 100% pronto para produção.
              </p>
            </div>
          </div>
        )}

        {/* Audit Error State */}
        {auditError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Falha na auditoria:</span>
              <span>{auditError}</span>
            </div>
          </div>
        )}

        {/* Initial Empty State */}
        {!auditResult && !isAuditing && (
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
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onRunAudit('selected')}
                disabled={isAuditing}
                className="flex-1 min-w-[120px] text-xs bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-lg px-3 py-2 flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isAuditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Reauditar
              </button>

              <button
                onClick={handleCopyFullBlueprint}
                disabled={!blueprintMarkdown}
                className="flex-1 min-w-[140px] text-xs bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-lg px-3 py-2 flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                title="Copiar todo o documento Markdown do Blueprint"
              >
                {isCopiedBlueprint ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedBlueprint ? 'Blueprint Copiado!' : 'Copiar Blueprint (.md)'}</span>
              </button>

              <button
                onClick={onDownloadBlueprint}
                disabled={isGeneratingBlueprint || !blueprintMarkdown}
                className="flex-1 min-w-[140px] text-xs bg-indigo-600/25 hover:bg-indigo-600/35 text-indigo-200 border border-indigo-500/40 rounded-lg px-3 py-2 flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>Baixar Blueprint (.md)</span>
              </button>
            </div>

            {/* View Switcher Tabs (Blueprint vs Findings) */}
            <div className="flex border-b border-white/10 pt-1">
              <button
                onClick={() => setActiveTab('blueprint')}
                className={cn(
                  "px-4 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer",
                  activeTab === 'blueprint'
                    ? "border-indigo-500 text-indigo-300 bg-indigo-500/10 rounded-t-lg"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                )}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>🔐 Blueprint Completo com Resoluções</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded-full">
                  Pronto para copiar
                </span>
              </button>

              <button
                onClick={() => setActiveTab('findings')}
                className={cn(
                  "px-4 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer",
                  activeTab === 'findings'
                    ? "border-indigo-500 text-indigo-300 bg-indigo-500/10 rounded-t-lg"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                )}
              >
                <LayoutList className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sumário de Vulnerabilidades ({auditResult.findings.length})</span>
              </button>
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

            {/* TAB 2: FINDINGS CARDS VIEW */}
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
          </>
        )}
      </div>
    </div>
  );
};
