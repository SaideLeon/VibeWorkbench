import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  FileCode, 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  CheckSquare, 
  Square, 
  MinusSquare, 
  CheckCheck, 
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { FileNode } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { buildTree, flattenTree } from '@/utils/file-tree';
import { getFolderSelectionState, getAllCodeFiles, isCodeFile } from '@/utils/file-selection';
import { cn } from '@/lib/utils';

interface FileTreeProps {
  files: FileNode[];
  onSelect: (path: string) => void;
  selectedPaths: Set<string>;
  onTogglePath: (path: string) => void;
  onToggleFolder: (folderPath: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  activeFilePath?: string;
  onRunAuditWithSelection?: () => void;
}

export const FileTree = ({ 
  files, 
  onSelect,
  selectedPaths,
  onTogglePath,
  onToggleFolder,
  onSelectAll,
  onDeselectAll,
  activeFilePath,
  onRunAuditWithSelection
}: FileTreeProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const parentRef = useRef<HTMLDivElement>(null);

  // Total code files count
  const allCodeFiles = useMemo(() => getAllCodeFiles(files), [files]);
  const totalCodeCount = allCodeFiles.length;
  const selectedCount = selectedPaths.size;

  // Build the tree structure
  const tree = useMemo(() => buildTree(files), [files]);

  // Filter and Flatten
  const flatNodes = useMemo(() => {
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      return files
        .filter(f => f.path.toLowerCase().includes(lowerTerm))
        .map(f => ({
          id: f.path,
          name: f.path,
          path: f.path,
          type: f.type,
          level: 0,
          children: [],
          isExpanded: false,
          hasChildren: false
        }));
    }

    return flattenTree(tree, expandedIds);
  }, [tree, expandedIds, searchTerm, files]);

  const rowVirtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 30, // 30px per row
    overscan: 6,
  });

  const toggleExpand = (path: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Expand all folders
  const expandAll = () => {
    const allDirs = files.filter(f => f.type === 'tree').map(f => f.path);
    setExpandedIds(new Set(allDirs));
  };

  // Collapse all folders
  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Auto-expand root folders initially if tree is small
  useEffect(() => {
    if (files.length > 0 && expandedIds.size === 0 && !searchTerm) {
      const topLevelDirs = files.filter(f => f.type === 'tree' && !f.path.includes('/')).map(f => f.path);
      if (topLevelDirs.length < 6) {
        setExpandedIds(new Set(topLevelDirs));
      }
    }
  }, [files]);

  return (
    <div className="h-full flex flex-col">
      {/* Header with Title & Selection Stats */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Explorador de Arquivos
        </h3>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors",
          selectedCount > 0 
            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" 
            : "bg-white/5 text-gray-400 border border-white/10"
        )}>
          {selectedCount} / {totalCodeCount} selec.
        </span>
      </div>

      {/* Quick Selection Toolbar */}
      <div className="flex items-center gap-1.5 mb-3 bg-[#161616] p-1.5 rounded-lg border border-white/5">
        <button
          onClick={onSelectAll}
          title="Selecionar todo o projeto para auditoria"
          className="flex-1 text-[10px] bg-white/5 hover:bg-white/10 hover:text-indigo-300 text-gray-300 border border-white/10 rounded px-2 py-1 flex items-center justify-center gap-1 transition-colors"
        >
          <CheckCheck className="w-3 h-3 text-indigo-400" />
          <span>Todo o Projeto</span>
        </button>

        {selectedCount > 0 && (
          <button
            onClick={onDeselectAll}
            title="Limpar seleção de arquivos"
            className="text-[10px] bg-white/5 hover:bg-red-500/20 hover:text-red-300 text-gray-400 border border-white/10 rounded px-2 py-1 flex items-center justify-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar</span>
          </button>
        )}
      </div>
      
      {/* Search Bar */}
      <div className="relative mb-2.5">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filtrar arquivos..."
          className="w-full bg-[#161616] border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 hover:text-gray-300"
          >
            ✕
          </button>
        )}
      </div>

      {/* Virtualized File List */}
      <div ref={parentRef} className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const node = flatNodes[virtualRow.index];
            const isFolder = node.type === 'tree';
            const isCode = isCodeFile(node.path);
            const isCurrentActive = activeFilePath === node.path;

            // Compute selection state
            let folderStats: { state: 'checked' | 'unchecked' | 'indeterminate'; total: number; selected: number } | null = null;
            let isFileSelected = false;

            if (isFolder) {
              folderStats = getFolderSelectionState(node.path, files, selectedPaths);
            } else {
              isFileSelected = selectedPaths.has(node.path);
            }

            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={cn(
                  "flex items-center rounded-md group hover:bg-white/[0.04] transition-colors pr-1",
                  isFileSelected && !isFolder && "bg-indigo-950/20 border-l-2 border-indigo-500",
                  folderStats?.state === 'checked' && isFolder && "bg-indigo-950/15",
                  isCurrentActive && "bg-white/10"
                )}
              >
                {/* Selection Checkbox (for file or folder) */}
                <div 
                  className="shrink-0 flex items-center justify-center pl-1.5"
                  style={{ paddingLeft: searchTerm ? '6px' : `${node.level * 14 + 6}px` }}
                >
                  {isFolder ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFolder(node.path);
                      }}
                      title={
                        folderStats?.state === 'checked' 
                          ? `Desmarcar pasta ${node.name} (${folderStats.selected} ficheiros)` 
                          : `Selecionar pasta ${node.name} (${folderStats?.total} ficheiros de código)`
                      }
                      className="p-1 hover:text-indigo-300 text-gray-500 transition-colors focus:outline-none"
                    >
                      {folderStats?.state === 'checked' ? (
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                      ) : folderStats?.state === 'indeterminate' ? (
                        <MinusSquare className="w-3.5 h-3.5 text-indigo-400/80" />
                      ) : (
                        <Square className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!isCode}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePath(node.path);
                      }}
                      title={
                        !isCode 
                          ? "Arquivo binário/não-código (ignorado)" 
                          : isFileSelected 
                            ? `Desmarcar ${node.name} da auditoria` 
                            : `Selecionar ${node.name} para auditoria`
                      }
                      className={cn(
                        "p-1 transition-colors focus:outline-none",
                        !isCode ? "opacity-20 cursor-not-allowed" : "text-gray-500 hover:text-indigo-300"
                      )}
                    >
                      {isFileSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100" />
                      )}
                    </button>
                  )}
                </div>

                {/* File / Folder Row Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isFolder) {
                      toggleExpand(node.path);
                    } else {
                      onSelect(node.path);
                    }
                  }}
                  className={cn(
                    "flex-1 text-left py-1 text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 truncate cursor-pointer pl-1",
                    isFolder && "font-medium text-gray-200",
                    isCurrentActive && "text-indigo-300 font-semibold"
                  )}
                >
                  {isFolder ? (
                    <span className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                      {node.isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
                      )}
                      {node.isExpanded ? (
                        <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
                      )}
                      <span className="truncate">{node.name}</span>
                      {folderStats && folderStats.selected > 0 && (
                        <span className="text-[9px] text-indigo-400/90 font-mono bg-indigo-500/10 px-1 py-0.2 rounded shrink-0">
                          {folderStats.selected}/{folderStats.total}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                      <FileCode className={cn(
                        "w-3.5 h-3.5 shrink-0 transition-colors",
                        isFileSelected ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-400",
                        !isCode && "opacity-40"
                      )} />
                      <span className="truncate">{node.name}</span>
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        
        {flatNodes.length === 0 && (
          <div className="text-xs text-gray-500 italic text-center py-6">
            Nenhum arquivo encontrado.
          </div>
        )}
      </div>

      {/* Selected quick audit button at bottom if files selected */}
      {selectedCount > 0 && onRunAuditWithSelection && (
        <div className="pt-2 border-t border-white/10 mt-2">
          <button
            onClick={onRunAuditWithSelection}
            className="w-full text-xs bg-red-600/20 hover:bg-red-600/35 active:bg-red-600/50 text-red-300 hover:text-white border border-red-500/30 hover:border-red-500/60 rounded-lg py-2 px-3 flex items-center justify-center gap-2 font-medium transition-all duration-150 shadow-sm hover:shadow-md hover:shadow-red-500/20 hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>Auditar Selecionados ({selectedCount})</span>
          </button>
        </div>
      )}
    </div>
  );
};
