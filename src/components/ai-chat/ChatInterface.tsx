import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  MessageSquare, 
  Loader2, 
  Maximize2, 
  Minimize2, 
  Code2, 
  Send, 
  Sparkles, 
  FileText, 
  Youtube, 
  ExternalLink, 
  Check, 
  Copy, 
  X as ClearIcon, 
  ArrowDown, 
  Layers, 
  ShieldCheck, 
  Route, 
  FolderTree,
  FileCode2,
  Bot,
  Cpu,
  ChevronDown,
  ChevronUp,
  Terminal,
  Wrench,
  Activity,
  BrainCircuit
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { AnalysisMessage, FileNode, AgentTrace } from '@/types';
import { GeminiQuotaNotice } from '@/components/ui/GeminiQuotaNotice';
import { parseGeminiErrorInfo } from '@/utils/ai-errors';
import { matchRepositoryFilePath } from '@/utils/repository-search';
import { DeepSeekHarnessVisualizer } from './DeepSeekHarnessVisualizer';
import { LiveReasoningStream } from './LiveReasoningStream';
import { ReasoningTracePanel } from './ReasoningTracePanel';

const CodeBlock = ({ language, children, ...props }: any) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(String(children));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden my-3 border border-white/10 shadow-sm">
      <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-1.5 bg-black/60 backdrop-blur-md hover:bg-black/80 rounded-md text-gray-300 hover:text-white transition-colors border border-white/10 cursor-pointer"
          title="Copiar código"
          aria-label="Copiar código"
        >
          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="bg-[#181818] px-3.5 py-1.5 text-[11px] font-mono text-gray-400 border-b border-white/5 flex justify-between items-center">
        <span className="uppercase tracking-wider text-[10px] text-gray-500 font-semibold">{language || 'código'}</span>
      </div>
      <SyntaxHighlighter
        {...props}
        PreTag="div"
        children={String(children).replace(/\n$/, '')}
        language={language || 'text'}
        style={atomDark}
        customStyle={{ margin: 0, padding: '1rem', borderRadius: 0, background: '#121212', fontSize: '12px', lineHeight: '1.6' }}
      />
    </div>
  );
};

interface ChatInterfaceProps {
  messages: AnalysisMessage[];
  onSendMessage: (msg: string) => void;
  isThinking: boolean;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  activeFileName?: string;
  repoName?: string;
  totalFilesCount?: number;
  onOpenFile?: (path: string) => void;
  availableFiles?: FileNode[] | string[];
  isHarnessMode?: boolean;
  onToggleHarnessMode?: () => void;
}

export const ChatInterface = ({ 
  messages, 
  onSendMessage, 
  isThinking,
  isMaximized,
  onToggleMaximize,
  activeFileName,
  repoName,
  totalFilesCount = 0,
  onOpenFile,
  availableFiles = [],
  isHarnessMode = true,
  onToggleHarnessMode
}: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Extract all file paths into a memoized set and array for instantaneous path matching
  const knownPaths = useMemo(() => {
    const paths = new Set<string>();
    for (const f of availableFiles) {
      if (typeof f === 'string') {
        paths.add(f);
      } else if (f && f.path) {
        paths.add(f.path);
      }
    }
    return paths;
  }, [availableFiles]);

  // Helper to check if an inline string references a file in the repository
  const resolveFilePath = useCallback((candidate: string): string | null => {
    if (!candidate || knownPaths.size === 0) return null;
    return matchRepositoryFilePath(candidate, knownPaths);
  }, [knownPaths]);

  // Auto-scroll to bottom on new messages or thinking state
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isThinking]);

  // Adjust textarea height dynamically with user input (min 44px, max 170px)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 170);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Handle scroll detection for "Scroll to bottom" button
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottom(isFarFromBottom);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed && !isThinking) {
      onSendMessage(trimmed);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '44px';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (unless Shift+Enter is pressed)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = async (content: string, idx: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedMessageIndex(idx);
    setTimeout(() => setCopiedMessageIndex(null), 2000);
  };

  return (
    <div className="flex flex-col bg-[#111] rounded-xl border border-white/10 overflow-hidden transition-all duration-300 h-full flex-1 min-h-0 w-full shadow-lg">
      {/* Chat Header */}
      <div className="p-3 md:p-3.5 border-b border-white/10 bg-[#151515] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            {isHarnessMode ? <Bot className="w-4 h-4 text-indigo-400" /> : <MessageSquare className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-gray-100 flex items-center gap-2 truncate">
              <span>{isHarnessMode ? "Mitigar Agente" : "Assistente de Código"}</span>
              <button
                type="button"
                onClick={onToggleHarnessMode}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all cursor-pointer",
                  isHarnessMode 
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20" 
                    : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700"
                )}
                title="Clique para alternar o motor de execução Mitigar"
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", isHarnessMode ? "bg-emerald-400 animate-pulse" : "bg-gray-500")} />
                {isHarnessMode ? "Mitigar Ativo (Cordis)" : "Modo LLM Direto"}
              </button>
            </h3>
            <p className="text-[11px] text-gray-400 truncate flex items-center gap-1.5">
              {isThinking ? (
                <span className="text-indigo-400 animate-pulse flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isHarnessMode ? "Mitigar orquestrando ferramentas e raciocínio..." : "Raciocinando sobre arquivos..."}
                </span>
              ) : (
                <span>
                  {repoName ? `Repositório: ${repoName} (${totalFilesCount} arquivos)` : 'Conectado aos arquivos do projeto'}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={onToggleMaximize}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white cursor-pointer"
            title={isMaximized ? "Restaurar visualização" : "Maximizar área de chat"}
            aria-label={isMaximized ? "Restaurar" : "Maximizar"}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Chat Messages Body */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 space-y-5 relative scroll-smooth" 
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 && !isThinking && (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-4 max-w-lg mx-auto space-y-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <Sparkles className="w-7 h-7 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <h4 className="text-base font-semibold text-gray-100">
                Assistente de Código & Conexão Semântica
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Pergunte qualquer detalhe sobre o código, rotas, arquitetura ou fluxos. O assistente localiza e analisa automaticamente os arquivos mais relevantes do repositório.
              </p>
            </div>

            {/* Quick Action Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
              <button
                onClick={() => onSendMessage("Qual é a estrutura arquitetural deste projeto e as principais tecnologias usadas?")}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#171717] hover:bg-[#202020] border border-white/10 hover:border-indigo-500/30 text-left transition-all text-xs text-gray-300 group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-200 truncate">Estrutura & Arquitetura</div>
                  <div className="text-[10px] text-gray-500">Visão geral e tecnologias</div>
                </div>
              </button>

              <button
                onClick={() => onSendMessage("Mapeie as rotas de API, endpoints ou controladores definidos neste repositório.")}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#171717] hover:bg-[#202020] border border-white/10 hover:border-indigo-500/30 text-left transition-all text-xs text-gray-300 group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                  <Route className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-200 truncate">Rotas & Endpoints</div>
                  <div className="text-[10px] text-gray-500">Mapeamento de APIs</div>
                </div>
              </button>

              <button
                onClick={() => onSendMessage("Como funciona o fluxo de autenticação, sessões e permissões no código?")}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#171717] hover:bg-[#202020] border border-white/10 hover:border-indigo-500/30 text-left transition-all text-xs text-gray-300 group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-200 truncate">Fluxo de Autenticação</div>
                  <div className="text-[10px] text-gray-500">Tokens, middleware e guardas</div>
                </div>
              </button>

              <button
                onClick={() => onSendMessage("Quais são as principais dependências, componentes e padrões de organização adotados?")}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#171717] hover:bg-[#202020] border border-white/10 hover:border-indigo-500/30 text-left transition-all text-xs text-gray-300 group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
                  <FolderTree className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-200 truncate">Componentes & Pastas</div>
                  <div className="text-[10px] text-gray-500">Padrões e dependências</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={cn(
              "flex gap-3 md:gap-3.5 group", 
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold shadow-sm",
              msg.role === 'user' 
                ? "bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white" 
                : "bg-[#1f1f23] border border-indigo-500/30 text-indigo-400"
            )}>
              {msg.role === 'user' ? "EU" : <Code2 className="w-3.5 h-3.5" />}
            </div>

            {/* Bubble */}
            <div className={cn(
              "max-w-[88%] md:max-w-[82%] rounded-2xl p-4 text-sm leading-relaxed overflow-hidden relative shadow-md transition-all",
              msg.role === 'user' 
                ? "bg-indigo-600 text-white rounded-tr-sm" 
                : "bg-[#181818] border border-white/10 text-gray-200 rounded-tl-sm"
            )}>
              {/* Copy message button */}
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleCopyMessage(msg.content, idx)}
                  className="p-1 rounded bg-black/40 hover:bg-black/60 text-gray-400 hover:text-white transition-colors border border-white/5 cursor-pointer"
                  title="Copiar mensagem"
                >
                  {copiedMessageIndex === idx ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>

              {msg.role === 'model' && msg.agentTraces && msg.agentTraces.length > 0 && (
                <div className="mb-3.5 space-y-2">
                  <ReasoningTracePanel 
                    traces={msg.agentTraces} 
                    toolsUsed={msg.toolsUsed} 
                    generatedPatches={msg.generatedPatches}
                    title="Mitigar • Árvore de Raciocínio & Decisão"
                    subtitle={`${msg.agentTraces.length} passos executados • ${msg.toolsUsed?.length || 0} ferramentas acionadas`}
                    defaultExpanded={false}
                  />
                </div>
              )}

              {msg.role === 'model' && parseGeminiErrorInfo(msg.content).isQuota ? (
                <GeminiQuotaNotice error={msg.content} compact />
              ) : (
                <div className="prose prose-invert prose-sm max-w-none break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      pre: ({ children }) => <>{children}</>,
                      code(props) {
                        const {children, className, node, ref, ...rest} = props;
                        const match = /language-(\w+)/.exec(className || '');
                        const codeStr = String(children).trim();
                        const isBlock = Boolean(match) || codeStr.includes('\n');
                        
                        if (isBlock) {
                          return (
                            <CodeBlock language={match ? match[1] : 'text'} children={children} {...rest} />
                          );
                        }

                        // Check if this inline code snippet represents a known file in the repository
                        const matchedFilePath = resolveFilePath(codeStr);
                        if (matchedFilePath && onOpenFile) {
                          return (
                            <button
                              type="button"
                              onClick={() => onOpenFile(matchedFilePath)}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 my-0.5 rounded-md font-mono text-[12px] bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 hover:text-indigo-100 border border-indigo-500/40 hover:border-indigo-400 transition-all cursor-pointer group/filelink align-baseline shadow-sm"
                              title={`Clique para abrir "${matchedFilePath}" no visualizador de código`}
                            >
                              <FileText className="w-3 h-3 text-indigo-400 group-hover/filelink:text-indigo-200 shrink-0 inline" />
                              <span className="font-semibold">{codeStr}</span>
                            </button>
                          );
                        }

                        return (
                          <code {...rest} ref={ref} className="bg-white/10 px-1.5 py-0.5 rounded text-[12px] font-mono text-indigo-300">
                            {children}
                          </code>
                        );
                      },
                      a({ href, children, ...rest }) {
                        const hrefStr = href || '';
                        // If link target is a relative repo path or hashtag
                        const matchedFilePath = resolveFilePath(hrefStr);
                        if (matchedFilePath && onOpenFile) {
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                onOpenFile(matchedFilePath);
                              }}
                              className="inline-flex items-center gap-1 font-medium text-indigo-400 hover:text-indigo-200 underline underline-offset-2 decoration-indigo-500/40 hover:decoration-indigo-300 cursor-pointer"
                              title={`Abrir ${matchedFilePath}`}
                            >
                              <FileText className="w-3 h-3 inline shrink-0" />
                              <span>{children}</span>
                            </button>
                          );
                        }

                        return (
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                            {...rest}
                          >
                            {children}
                          </a>
                        );
                      },
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-3 border border-white/10 rounded-lg bg-[#141414]">
                          <table className="w-full text-left text-xs border-collapse min-w-[320px]">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-white/5 text-gray-200 font-semibold text-[11px] uppercase tracking-wider border-b border-white/10">
                          {children}
                        </thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-white/5 bg-[#181818]">
                          {children}
                        </tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0">
                          {children}
                        </tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-3 py-2 text-gray-200 font-medium border-r border-white/5 last:border-r-0">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-3 py-2 text-gray-300 border-r border-white/5 last:border-r-0">
                          {children}
                        </td>
                      ),
                      p: ({ children }) => (
                        <div className="leading-relaxed mb-2.5 last:mb-0">
                          {children}
                        </div>
                      )
                    }}
                  >
                    {DOMPurify.sanitize(msg.content)}
                  </ReactMarkdown>
                </div>
              )}

              {/* Referenced / Consulted Repository Files */}
              {msg.referencedFiles && msg.referencedFiles.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    <FileCode2 className="w-3 h-3 text-indigo-400" />
                    <span>Arquivos Consultados no Repositório ({msg.referencedFiles.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.referencedFiles.map((file, i) => (
                      <button
                        key={i}
                        onClick={() => onOpenFile?.(file)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-mono text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/25 px-2.5 py-1 rounded-md transition-colors cursor-pointer group/chip"
                        title={`Abrir ${file} no visualizador de código`}
                      >
                        <FileText className="w-3 h-3 text-indigo-400 group-hover/chip:text-indigo-200 shrink-0" />
                        <span className="truncate max-w-[220px]">{file}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Grounding & Web Links */}
              {msg.relatedLinks && msg.relatedLinks.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-white/10">
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Referências & Tutoriais
                  </h4>
                  <div className="grid gap-1.5">
                    {msg.relatedLinks.map((link, i) => (
                      <a 
                        key={i} 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 p-2 rounded-lg hover:bg-indigo-500/20 transition-colors"
                      >
                        {link.url.includes('youtube') ? (
                          <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="truncate">{link.title || link.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-3 md:gap-3.5">
            <div className="w-7 h-7 rounded-lg bg-[#1f1f23] border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="w-full max-w-[92%] md:max-w-[85%]">
              <LiveReasoningStream 
                repoName={repoName}
                activeFile={activeFileName}
                isHarnessMode={isHarnessMode}
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Scroll-to-Bottom Button */}
      {showScrollBottom && (
        <div className="relative z-10 flex justify-center -mt-10 mb-2 pointer-events-none">
          <button
            onClick={scrollToBottom}
            className="pointer-events-auto p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg border border-indigo-400/30 transition-all transform hover:scale-105 flex items-center gap-1 text-xs cursor-pointer"
            title="Rolar para a última mensagem"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span className="pr-1 text-[11px]">Mais recente</span>
          </button>
        </div>
      )}

      {/* Modernized Chat Input Bar */}
      <div className="p-3 md:p-3.5 bg-[#141414] border-t border-white/10 shrink-0">
        {/* Context pill banner */}
        <div className="flex items-center justify-between gap-2 mb-2 px-1 text-[11px] text-gray-400">
          <div className="flex items-center gap-2 truncate">
            {activeFileName ? (
              <span className="inline-flex items-center gap-1 text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded truncate">
                <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="truncate">Foco: {activeFileName}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-gray-400">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Busca semântica em todo o repositório</span>
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-500 hidden sm:inline">
            <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[9px]">Shift + Enter</kbd> nova linha
          </span>
        </div>

        {/* Input Form Box */}
        <div className="relative flex items-end bg-[#0a0a0a] border border-white/10 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-xl transition-all p-1.5 shadow-inner">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeFileName ? `Pergunte sobre ${activeFileName.split('/').pop()} ou qualquer parte do projeto...` : "Sugira uma melhoria, pergunte sobre a arquitetura ou peça um snippet..."}
            rows={1}
            disabled={isThinking}
            className="w-full bg-transparent border-0 text-gray-100 text-sm placeholder-gray-500 focus:outline-none resize-none px-3 py-2 min-h-[44px] max-h-[170px] leading-relaxed scrollbar-thin"
          />

          <div className="flex items-center gap-1.5 pb-1 pr-1 shrink-0">
            {input.trim().length > 0 && !isThinking && (
              <button
                type="button"
                onClick={() => {
                  setInput('');
                  if (textareaRef.current) textareaRef.current.style.height = '44px';
                }}
                className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                title="Limpar texto"
              >
                <ClearIcon className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isThinking}
              className={cn(
                "p-2.5 rounded-xl font-medium transition-all flex items-center justify-center cursor-pointer",
                input.trim() && !isThinking
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:shadow-indigo-500/25 transform hover:scale-105 active:scale-95"
                  : "bg-white/5 text-gray-500 cursor-not-allowed opacity-60"
              )}
              title={isThinking ? "Aguarde a IA responder" : "Enviar mensagem (Enter)"}
              aria-label="Enviar"
            >
              {isThinking ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
