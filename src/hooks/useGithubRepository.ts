import { useState, useCallback, startTransition } from 'react';
import { FileNode } from '@/types';
import { githubApi } from '@/services/github.api';
import { getFolderDescendantFiles, getAllCodeFiles, isCodeFile } from '@/utils/file-selection';

export function useGithubRepository() {
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [branch, setBranch] = useState<string>('main');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ path: string, content: string } | null>(null);
  
  // Selected paths for batch operations / security audit
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // History
  const [fileHistory, setFileHistory] = useState<{ path: string, content: string }[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  const analyzeRepository = useCallback(async (url: string, performAnalysis: (files: { path: string, content: string }[]) => Promise<string>) => {
    setIsLoading(true);
    setError(null);
    setRepoUrl(url);
    setSelectedPaths(new Set());
    
    try {
      const cleanUrl = url.replace(/\.git\/?$/, "").replace(/\/$/, "");
      const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) throw new Error("URL do GitHub inválida. Use o formato: https://github.com/usuario/repo");
      const [, owner, repo] = match;

      const treeData = await githubApi.getTree(owner, repo);
      // We keep all nodes (trees and blobs) for the file explorer
      const allNodes = treeData.tree;
      
      // Use startTransition for potentially expensive UI updates
      startTransition(() => {
          setFiles(allNodes);
      });

      const currentBranch = treeData.branch || 'main';
      setBranch(currentBranch);
      
      // Fetch key files for initial analysis
      // Filter for blobs only
      const priorityFiles = allNodes.filter((f) => 
        f.type === 'blob' && f.path.match(/(README|package\.json|tsconfig\.json|src\/main|src\/App|server\.ts|\.py|\.js|\.tsx)$/i)
      ).slice(0, 5);

      const fileContents = await Promise.all(priorityFiles.map(async (f) => {
        const content = await githubApi.getFileContent(owner, repo, f.path, currentBranch);
        return { path: f.path, content };
      }));

      await performAnalysis(fileContents);
      
      return { owner, repo, allFiles: allNodes, branch: currentBranch };
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ocorreu um erro ao buscar o repositório.");
      // throw err; // Don't throw, just set error state
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectFile = useCallback(async (path: string) => {
    if (!repoUrl) return;
    
    if (selectedFile && selectedFile.path === path) return;

    try {
      const cleanUrl = repoUrl.replace(/\.git\/?$/, "").replace(/\/$/, "");
      const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return;
      const [, owner, repo] = match;

      const content = await githubApi.getFileContent(owner, repo, path, branch);
      
      const newFile = { path, content };
      setSelectedFile(newFile);
      
      const newHistory = fileHistory.slice(0, currentHistoryIndex + 1);
      newHistory.push(newFile);
      setFileHistory(newHistory);
      setCurrentHistoryIndex(newHistory.length - 1);
      
      return newFile;
    } catch (err) {
      console.error(err);
      setError("Falha ao carregar conteúdo do arquivo");
    }
  }, [repoUrl, selectedFile, fileHistory, currentHistoryIndex, branch]);

  // Toggle single file selection
  const togglePathSelection = useCallback((path: string) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Toggle directory / subdirectory selection (all descendant files)
  const toggleFolderSelection = useCallback((folderPath: string) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      const descendants = getFolderDescendantFiles(folderPath, files, true);
      const allSelected = descendants.length > 0 && descendants.every(f => next.has(f.path));
      
      if (allSelected) {
        // Deselect all
        for (const file of descendants) {
          next.delete(file.path);
        }
      } else {
        // Select all descendants
        for (const file of descendants) {
          next.add(file.path);
        }
      }
      return next;
    });
  }, [files]);

  // Select all code files in the project
  const selectAllPaths = useCallback(() => {
    const codeFiles = getAllCodeFiles(files);
    setSelectedPaths(new Set(codeFiles.map(f => f.path)));
  }, [files]);

  // Deselect all files
  const deselectAllPaths = useCallback(() => {
    setSelectedPaths(new Set());
  }, []);

  // Fetch contents of multiple files with concurrency control
  const fetchFilesByPaths = useCallback(async (
    targetPaths: string[],
    onProgress?: (loaded: number, total: number) => void
  ): Promise<{ path: string; content: string }[]> => {
    if (!repoUrl || targetPaths.length === 0) return [];

    const cleanUrl = repoUrl.replace(/\.git\/?$/, "").replace(/\/$/, "");
    const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) throw new Error("URL do GitHub inválida");
    const [, owner, repo] = match;

    const results: { path: string; content: string }[] = [];
    const validPaths = targetPaths.filter(p => isCodeFile(p));
    const total = validPaths.length;
    let loaded = 0;

    // Concurrency pool of max 6 simultaneous requests
    const concurrency = 6;
    const queue = [...validPaths];

    const worker = async () => {
      while (queue.length > 0) {
        const path = queue.shift();
        if (!path) break;
        try {
          const content = await githubApi.getFileContent(owner, repo, path, branch);
          results.push({ path, content });
        } catch (err) {
          console.warn(`Não foi possível carregar ${path}:`, err);
        } finally {
          loaded++;
          if (onProgress) {
            onProgress(loaded, total);
          }
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
    await Promise.all(workers);

    return results;
  }, [repoUrl, branch]);

  const navigateBack = useCallback(() => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      setSelectedFile(fileHistory[newIndex]);
    }
  }, [currentHistoryIndex, fileHistory]);

  const navigateForward = useCallback(() => {
    if (currentHistoryIndex < fileHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      setSelectedFile(fileHistory[newIndex]);
    }
  }, [currentHistoryIndex, fileHistory]);

  const clearRepository = useCallback(() => {
    setRepoUrl(null);
    setFiles([]);
    setSelectedFile(null);
    setSelectedPaths(new Set());
    setFileHistory([]);
    setCurrentHistoryIndex(-1);
    githubApi.clearCache();
  }, []);

  return {
    repoUrl,
    files,
    isLoading,
    error,
    selectedFile,
    selectedPaths,
    setSelectedPaths,
    togglePathSelection,
    toggleFolderSelection,
    selectAllPaths,
    deselectAllPaths,
    fetchFilesByPaths,
    fileHistory,
    currentHistoryIndex,
    analyzeRepository,
    selectFile,
    navigateBack,
    navigateForward,
    clearRepository,
    setSelectedFile, // Exposed for closing file viewer
    setError
  };
}
