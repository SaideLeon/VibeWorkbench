import { useState, useMemo, FC } from 'react';
import { 
  Check, 
  Copy, 
  ChevronDown, 
  ChevronRight, 
  ArrowUp, 
  ArrowDown, 
  MoreHorizontal,
  Code2,
  FileCode2
} from 'lucide-react';
import { sanitizeUnifiedDiff } from '@/utils/patch-sanitizer';

interface UnifiedPatchViewerProps {
  patchText: string;
}

interface DiffLine {
  type: 'add' | 'del' | 'context' | 'meta';
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffHunk {
  hunkHeader: string;
  lines: DiffLine[];
}

interface ParsedDiffFile {
  filePath: string;
  isNew: boolean;
  isDeleted: boolean;
  headerLines: string[];
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  raw: string;
}

/**
 * Tokenizador de sintaxe de alta precisão para TS, JS, Python, Go, Rust, Java, SQL
 */
function tokenizeCodeLine(code: string): { type: string; value: string }[] {
  if (!code) return [{ type: 'plain', value: '' }];

  // Se for comentário de linha única
  if (code.trim().startsWith('//') || code.trim().startsWith('#') || code.trim().startsWith('--')) {
    return [{ type: 'comment', value: code }];
  }

  const tokens: { type: string; value: string }[] = [];
  
  // Expressão regular abrangente para tokens comuns de programação
  const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|export|from|type|interface|class|def|fn|func|function|const|let|var|async|await|return|if|else|try|catch|throw|finally|new|typeof|instanceof|switch|case|break|continue|default|while|for|of|in|public|private|protected|static|readonly|abstract|implements|extends|override|null|undefined|true|false|void|struct|trait|enum|impl|select|from|where|insert|into|update|delete|create|table|alter)\b|\b(?:Promise|Uint8Array|ArrayBuffer|Array|Record|Set|Map|String|Number|Boolean|Object|Function|File|Blob|Request|Response|NextResponse|NextRequest|Error|CustomError|Buffer|VerificationRequest)\b|\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()|\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b|[{}()\[\],;.:?!=&|+\-*\/%<>^~]+|[^\s{}()\[\],;.:?!=&|+\-*\/%<>^~]+|\s+)/g;

  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = tokenRegex.exec(code)) !== null) {
    const text = match[0];
    const index = match.index;

    if (index > lastIndex) {
      tokens.push({ type: 'plain', value: code.substring(lastIndex, index) });
    }

    if (text.startsWith('//') || text.startsWith('/*') || text.startsWith('#')) {
      tokens.push({ type: 'comment', value: text });
    } else if (text.startsWith('"') || text.startsWith("'") || text.startsWith('`')) {
      tokens.push({ type: 'string', value: text });
    } else if (/^(?:import|export|from|type|interface|class|def|fn|func|function|const|let|var|async|await|return|if|else|try|catch|throw|finally|new|typeof|instanceof|switch|case|break|continue|default|while|for|of|in|public|private|protected|static|readonly|abstract|implements|extends|override|struct|trait|enum|impl|select|from|where|insert|into|update|delete|create|table|alter)$/.test(text)) {
      tokens.push({ type: 'keyword', value: text });
    } else if (/^(?:true|false|null|undefined|void)$/.test(text)) {
      tokens.push({ type: 'boolean-null', value: text });
    } else if (/^(?:Promise|Uint8Array|ArrayBuffer|Array|Record|Set|Map|String|Number|Boolean|Object|Function|File|Blob|Request|Response|NextResponse|NextRequest|Error|CustomError|Buffer|VerificationRequest)$/.test(text)) {
      tokens.push({ type: 'type', value: text });
    } else if (/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/.test(text)) {
      tokens.push({ type: 'number', value: text });
    } else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(text) && code.substring(index + text.length).trim().startsWith('(')) {
      tokens.push({ type: 'function', value: text });
    } else if (/^[{}()\[\],;.:?!=&|+\-*\/%<>^~]+$/.test(text)) {
      tokens.push({ type: 'operator', value: text });
    } else {
      tokens.push({ type: 'identifier', value: text });
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push({ type: 'plain', value: code.substring(lastIndex) });
  }

  return tokens;
}

const SyntaxTokensRenderer: FC<{ text: string; lineType: 'add' | 'del' | 'context' | 'meta' }> = ({ text, lineType }) => {
  const tokens = useMemo(() => tokenizeCodeLine(text), [text]);

  return (
    <>
      {tokens.map((tok, idx) => {
        switch (tok.type) {
          case 'comment':
            return (
              <span key={idx} className={lineType === 'add' ? 'text-[#7ee787]/80' : 'text-[#8b949e] italic'}>
                {tok.value}
              </span>
            );
          case 'keyword':
            return (
              <span key={idx} className="text-[#ff7b72] font-medium">
                {tok.value}
              </span>
            );
          case 'type':
            return (
              <span key={idx} className="text-[#79c0ff] font-medium">
                {tok.value}
              </span>
            );
          case 'function':
            return (
              <span key={idx} className="text-[#d2a8ff]">
                {tok.value}
              </span>
            );
          case 'string':
            return (
              <span key={idx} className="text-[#a5d6ff]">
                {tok.value}
              </span>
            );
          case 'number':
          case 'boolean-null':
            return (
              <span key={idx} className="text-[#79c0ff]">
                {tok.value}
              </span>
            );
          case 'operator':
            return (
              <span key={idx} className="text-[#79c0ff]/70">
                {tok.value}
              </span>
            );
          case 'identifier':
            return (
              <span key={idx} className={lineType === 'add' ? 'text-[#e6edf3]' : lineType === 'del' ? 'text-[#ffdcd7]' : 'text-[#c9d1d9]'}>
                {tok.value}
              </span>
            );
          default:
            return <span key={idx}>{tok.value}</span>;
        }
      })}
    </>
  );
};

export function UnifiedPatchViewer({ patchText }: UnifiedPatchViewerProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual');
  const [copiedFileIndex, setCopiedFileIndex] = useState<number | null>(null);
  const [collapsedFiles, setCollapsedFiles] = useState<Record<number, boolean>>({});

  const cleanPatch = useMemo(() => sanitizeUnifiedDiff(patchText), [patchText]);

  // Parse patch into structured files with precise old and new line numbers
  const parsedFiles = useMemo(() => {
    if (!cleanPatch) return [];

    const fileBlocks: ParsedDiffFile[] = [];
    const lines = cleanPatch.split('\n');

    let currentFile: ParsedDiffFile | null = null;
    let currentHunk: DiffHunk | null = null;

    let currentOldLine = 1;
    let currentNewLine = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('diff --git')) {
        if (currentHunk && currentFile) {
          currentFile.hunks.push(currentHunk);
          currentHunk = null;
        }
        if (currentFile) {
          fileBlocks.push(currentFile);
        }

        const match = line.match(/diff --git a\/(.+?) b\/(.+)/);
        const path = match ? match[2] : line.replace('diff --git ', '');

        currentFile = {
          filePath: path,
          isNew: false,
          isDeleted: false,
          headerLines: [line],
          hunks: [],
          additions: 0,
          deletions: 0,
          raw: line + '\n',
        };
        continue;
      }

      if (!currentFile) continue;

      currentFile.raw += line + '\n';

      if (line.startsWith('new file mode')) {
        currentFile.isNew = true;
        currentFile.headerLines.push(line);
      } else if (line.startsWith('deleted file mode')) {
        currentFile.isDeleted = true;
        currentFile.headerLines.push(line);
      } else if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('index ')) {
        currentFile.headerLines.push(line);
      } else if (line.startsWith('@@')) {
        if (currentHunk) {
          currentFile.hunks.push(currentHunk);
        }

        // Extrai o ponto de partida das linhas: @@ -oldStart,oldCount +newStart,newCount @@
        const hunkMatch = line.match(/@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
        if (hunkMatch) {
          currentOldLine = parseInt(hunkMatch[1], 10);
          currentNewLine = parseInt(hunkMatch[2], 10);
        } else {
          currentOldLine = 1;
          currentNewLine = 1;
        }

        currentHunk = {
          hunkHeader: line,
          lines: [],
        };
      } else if (currentHunk) {
        if (line.startsWith('+')) {
          const text = line.substring(1);
          currentHunk.lines.push({
            type: 'add',
            text,
            newLineNumber: currentNewLine++,
          });
          currentFile.additions++;
        } else if (line.startsWith('-')) {
          const text = line.substring(1);
          currentHunk.lines.push({
            type: 'del',
            text,
            oldLineNumber: currentOldLine++,
          });
          currentFile.deletions++;
        } else if (line.startsWith('\\')) {
          currentHunk.lines.push({
            type: 'meta',
            text: line,
          });
        } else {
          const text = line.startsWith(' ') ? line.substring(1) : line;
          currentHunk.lines.push({
            type: 'context',
            text,
            oldLineNumber: currentOldLine++,
            newLineNumber: currentNewLine++,
          });
        }
      }
    }

    if (currentHunk && currentFile) {
      currentFile.hunks.push(currentHunk);
    }
    if (currentFile) {
      fileBlocks.push(currentFile);
    }

    return fileBlocks;
  }, [cleanPatch]);

  const toggleCollapse = (idx: number) => {
    setCollapsedFiles(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopyFile = async (rawContent: string, idx: number) => {
    await navigator.clipboard.writeText(rawContent.trim());
    setCopiedFileIndex(idx);
    setTimeout(() => setCopiedFileIndex(null), 2000);
  };

  const handleCopyFilePath = async (path: string) => {
    await navigator.clipboard.writeText(path);
  };

  if (!cleanPatch) {
    return (
      <div className="p-8 text-center text-gray-500 font-mono text-xs">
        Nenhum conteúdo de patch disponível.
      </div>
    );
  }

  // Gera os 5 quadradinhos de diff proporcionais do GitHub
  const renderDiffBlocks = (adds: number, dels: number) => {
    const total = adds + dels;
    if (total === 0) return null;

    const greenBlocks = Math.round((adds / total) * 5);
    const redBlocks = 5 - greenBlocks;

    return (
      <div className="flex items-center gap-0.5 ml-1.5" title={`${adds} adições, ${dels} remoções`}>
        {Array.from({ length: greenBlocks }).map((_, i) => (
          <span key={`g-${i}`} className="w-1.5 h-1.5 rounded-[1px] bg-[#3fb950]" />
        ))}
        {Array.from({ length: redBlocks }).map((_, i) => (
          <span key={`r-${i}`} className="w-1.5 h-1.5 rounded-[1px] bg-[#f85149]" />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Header Mode Toggle */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-300">
            {parsedFiles.length} {parsedFiles.length === 1 ? 'arquivo alterado' : 'arquivos alterados'}
          </span>
        </div>

        <div className="flex items-center bg-[#161b22] border border-[#30363d] rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setViewMode('visual')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium flex items-center gap-1.5 ${
              viewMode === 'visual'
                ? 'bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Visualização Diff (VS Code / PR)</span>
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium flex items-center gap-1.5 ${
              viewMode === 'raw'
                ? 'bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Texto Bruto (.patch)</span>
          </button>
        </div>
      </div>

      {viewMode === 'raw' ? (
        <div className="rounded-xl overflow-hidden border border-[#30363d] shadow-2xl">
          <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] text-xs font-mono text-gray-300 flex items-center justify-between">
            <span>security-remediation.patch</span>
            <span className="text-[10px] text-[#3fb950] bg-[#238636]/15 px-2 py-0.5 rounded border border-[#238636]/30">
              Git Unified Diff
            </span>
          </div>
          <pre className="bg-[#0d1117] text-[#e6edf3] font-mono text-[12px] p-4 overflow-x-auto max-h-[560px] overflow-y-auto leading-relaxed select-all">
            {cleanPatch}
          </pre>
        </div>
      ) : (
        <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
          {parsedFiles.map((file, fileIdx) => {
            const isCollapsed = collapsedFiles[fileIdx];

            return (
              <div
                key={fileIdx}
                className="rounded-xl border border-[#30363d] bg-[#0d1117] overflow-hidden shadow-xl"
              >
                {/* 1. File Title Header Bar (Idêntico ao VS Code / GitHub PR) */}
                <div className="bg-[#161b22] px-4 py-2.5 border-b border-[#30363d] flex items-center justify-between gap-3 select-none">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      onClick={() => toggleCollapse(fileIdx)}
                      className="text-gray-400 hover:text-gray-200 cursor-pointer p-0.5 rounded transition-colors"
                      title={isCollapsed ? "Expandir arquivo" : "Recolher arquivo"}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {/* Checkmark icon */}
                    <span className="text-[#3fb950] font-bold text-xs">✓</span>

                    {/* File Path */}
                    <span className="font-mono text-xs font-semibold text-[#e6edf3] truncate">
                      {file.filePath}
                    </span>

                    {/* Copy Path Icon */}
                    <button
                      onClick={() => handleCopyFilePath(file.filePath)}
                      className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                      title="Copiar caminho do arquivo"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {file.isNew && (
                      <span className="text-[10px] bg-[#238636]/20 text-[#3fb950] border border-[#238636]/30 px-1.5 py-0.2 rounded font-mono shrink-0">
                        novo arquivo
                      </span>
                    )}
                    {file.isDeleted && (
                      <span className="text-[10px] bg-[#da3633]/20 text-[#f85149] border border-[#da3633]/30 px-1.5 py-0.2 rounded font-mono shrink-0">
                        removido
                      </span>
                    )}
                  </div>

                  {/* Right: +31 -3 colored stats and block diff indicator */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                      {file.additions > 0 && (
                        <span className="text-[#3fb950]">+{file.additions}</span>
                      )}
                      {file.deletions > 0 && (
                        <span className="text-[#f85149]">-{file.deletions}</span>
                      )}
                      {renderDiffBlocks(file.additions, file.deletions)}
                    </div>

                    <button
                      onClick={() => handleCopyFile(file.raw, fileIdx)}
                      className="text-xs bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] rounded px-2.5 py-1 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Copiar alterações deste arquivo"
                    >
                      {copiedFileIndex === fileIdx ? (
                        <Check className="w-3.5 h-3.5 text-[#3fb950]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span className="hidden sm:inline text-[11px]">
                        {copiedFileIndex === fileIdx ? 'Copiado!' : 'Copiar Diff'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. File Content (Hunks with Dual Line Numbers & Syntax Colored Diff) */}
                {!isCollapsed && (
                  <div className="font-mono text-[12px] leading-relaxed overflow-x-auto bg-[#0d1117]">
                    {file.hunks.map((hunk, hunkIdx) => (
                      <div key={hunkIdx}>
                        {/* Hunk Blue Banner Header */}
                        <div className="bg-[#1b253b] text-[#79c0ff] px-3 py-1.5 text-[11px] font-semibold flex items-center gap-2 border-y border-[#30363d] select-none">
                          <span className="text-[#79c0ff] font-bold">↑</span>
                          <span className="tracking-wide">{hunk.hunkHeader}</span>
                        </div>

                        {/* Line by Line Diff Grid */}
                        <div className="divide-y divide-transparent">
                          {hunk.lines.map((line, lineIdx) => {
                            const isAdd = line.type === 'add';
                            const isDel = line.type === 'del';
                            const isContext = line.type === 'context';

                            return (
                              <div
                                key={lineIdx}
                                className={`flex items-stretch font-mono ${
                                  isAdd
                                    ? 'bg-[#0d2818] text-[#e6edf3] hover:bg-[#133822]'
                                    : isDel
                                    ? 'bg-[#2e1317] text-[#ffdcd7] hover:bg-[#3d181e]'
                                    : 'hover:bg-[#161b22]/70 text-[#c9d1d9]'
                                } transition-colors group`}
                              >
                                {/* Old Line Number Column */}
                                <div
                                  className={`w-10 shrink-0 text-right pr-2 py-0.5 select-none font-mono text-[11px] ${
                                    isDel
                                      ? 'text-[#f85149] bg-[#2e1317]'
                                      : 'text-[#6e7681]'
                                  }`}
                                >
                                  {line.oldLineNumber ?? ''}
                                </div>

                                {/* New Line Number Column */}
                                <div
                                  className={`w-10 shrink-0 text-right pr-2 py-0.5 select-none font-mono text-[11px] ${
                                    isAdd
                                      ? 'text-[#3fb950] bg-[#0d2818]'
                                      : 'text-[#6e7681]'
                                  }`}
                                >
                                  {line.newLineNumber ?? ''}
                                </div>

                                {/* Sign Column (+ / - / space) */}
                                <div
                                  className={`w-6 shrink-0 text-center py-0.5 select-none font-bold text-[12px] ${
                                    isAdd
                                      ? 'text-[#3fb950]'
                                      : isDel
                                      ? 'text-[#f85149]'
                                      : 'text-[#6e7681]'
                                  }`}
                                >
                                  {isAdd ? '+' : isDel ? '-' : ' '}
                                </div>

                                {/* Code Content with Rich Syntax Highlighting */}
                                <div className="flex-1 py-0.5 pl-2 pr-4 overflow-x-auto whitespace-pre font-mono">
                                  <SyntaxTokensRenderer
                                    text={line.text}
                                    lineType={line.type}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
