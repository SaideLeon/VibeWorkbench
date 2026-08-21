import { useState } from 'react';
import { FileCode, Minimize2, Maximize2, X, ArrowLeft, ArrowRight, Copy, Check, ShieldAlert, CheckSquare, Square } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

export const FileViewer = ({ 
  file, 
  onClose, 
  isMaximized, 
  onToggleMaximize,
  onBack,
  onForward,
  canGoBack,
  canGoForward,
  isSelectedForAudit,
  onToggleAuditSelection,
  onAuditSingleFile
}: { 
  file: { path: string, content: string }, 
  onClose: () => void, 
  isMaximized: boolean, 
  onToggleMaximize: () => void,
  onBack: () => void,
  onForward: () => void,
  canGoBack: boolean,
  canGoForward: boolean,
  isSelectedForAudit?: boolean,
  onToggleAuditSelection?: () => void,
  onAuditSingleFile?: () => void
}) => {
  const extension = file.path.split('.').pop() || 'text';
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col bg-[#111] rounded-xl border border-white/10 overflow-hidden relative transition-all duration-300 h-full flex-1 min-h-0 w-full">
      <div className="p-3 md:p-4 border-b border-white/10 bg-[#151515] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1 shrink-0">
            <button 
              onClick={onBack}
              disabled={!canGoBack}
              className="p-1 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={onForward}
              disabled={!canGoForward}
              className="p-1 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Avançar"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <h3 className="font-medium flex items-center gap-2 truncate text-sm">
            <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">{file.path}</span>
          </h3>
        </div>
        <div className="flex items-center justify-end gap-1.5 flex-wrap shrink-0">
          {/* Quick toggle audit inclusion */}
          {onToggleAuditSelection && (
            <button
              onClick={onToggleAuditSelection}
              className={cn(
                "text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer",
                isSelectedForAudit 
                  ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30" 
                  : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10"
              )}
              title={isSelectedForAudit ? "Remover da seleção de auditoria" : "Adicionar à seleção de auditoria"}
            >
              {isSelectedForAudit ? <CheckSquare className="w-3.5 h-3.5 text-indigo-400" /> : <Square className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{isSelectedForAudit ? "Selecionado para auditoria" : "Selecionar para auditoria"}</span>
            </button>
          )}

          {/* Quick single audit button */}
          {onAuditSingleFile && (
            <button
              onClick={onAuditSingleFile}
              className="text-xs px-2.5 py-1.5 rounded-lg border bg-red-600/10 text-red-300 border-red-500/30 hover:bg-red-600/20 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Auditar somente este arquivo"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[11px] hidden sm:inline">Auditar este</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white cursor-pointer"
            title="Copiar conteúdo"
          >
            {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button 
            onClick={onToggleMaximize} 
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white hidden md:block cursor-pointer"
            title={isMaximized ? "Restaurar" : "Maximizar"}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white cursor-pointer"
            title="Fechar visualizador"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto text-sm w-full bg-[#0d0d0d]">
        <SyntaxHighlighter
          language={extension}
          style={atomDark}
          showLineNumbers
          wrapLines={false}
          wrapLongLines={false}
          lineNumberStyle={{ minWidth: '3.2em', paddingRight: '1.2em', color: '#555', userSelect: 'none', textAlign: 'right' }}
          codeTagProps={{ style: { fontFamily: 'monospace', whiteSpace: 'pre' } }}
          customStyle={{ 
            margin: 0, 
            padding: '1.25rem', 
            background: '#0d0d0d', 
            minHeight: '100%', 
            fontSize: '12px', 
            lineHeight: '1.6',
            fontFamily: 'monospace'
          }}
        >
          {file.content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};
