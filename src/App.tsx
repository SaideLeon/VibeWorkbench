import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, FileText, MessageSquare, Files, Eye, Menu, X as CloseIcon, ShieldAlert, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllCodeFiles, getAuditableCodeFiles } from '@/utils/file-selection';
import { findRelevantRepositoryFiles } from '@/utils/repository-search';

// Components
import { Header } from '@/components/layout/Header';
import { RepoInput } from '@/components/layout/RepoInput';
import { LandingPage } from '@/components/landing/LandingPage';
import { FileTree } from '@/components/file-explorer/FileTree';
import { FileViewer } from '@/components/file-explorer/FileViewer';
import { ChatInterface } from '@/components/ai-chat/ChatInterface';
import { SecurityAuditPanel } from '@/components/security/SecurityAuditPanel';
import { CommitHistoryModal } from '@/components/git-history/CommitHistoryModal';

// Hooks
import { useGithubRepository, parseGithubUrl } from '@/hooks/useGithubRepository';
import { useAIChat } from '@/hooks/useAIChat';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { useGitHistoryAudit } from '@/hooks/useGitHistoryAudit';
import { githubApi } from '@/services/github.api';

import { useToast } from '@/components/ui/Toast';

type MobileTab = 'files' | 'chat' | 'preview';
type MainPanel = 'chat' | 'security';
type ViewMode = 'landing' | 'workbench';

export default function App() {
  const { showToast, hideToast } = useToast();
  const [maximizedPanel, setMaximizedPanel] = useState<'chat' | 'file' | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMainPanel, setActiveMainPanel] = useState<MainPanel>('chat');
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [isCommitHistoryOpen, setIsCommitHistoryOpen] = useState(false);

  // Custom Hooks
  const {
    repoUrl,
    branch,
    files,
    isLoading: isRepoLoading,
    error: repoError,
    selectedFile,
    selectedPaths,
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
    setSelectedFile,
    setError: setRepoError
  } = useGithubRepository();

  const {
    chatHistory,
    isThinking,
    isHarnessMode,
    toggleHarnessMode,
    sendMessage,
    apiKeys,
    keyIndex,
    addApiKeys,
    removeApiKey,
    clearApiKeys,
    setActiveKeyIndex,
    handleKeyFileUpload
  } = useAIChat();

  const {
    isAuditing,
    auditProgress,
    setAuditProgress,
    auditResult,
    blueprintMarkdown,
    patchContent,
    auditError,
    isGeneratingBlueprint: isGeneratingSecurityBlueprint,
    isGeneratingPatch: isGeneratingSecurityPatch,
    isCreatingPR,
    createdPR,
    lastContextFiles,
    isHarnessAuditMode,
    toggleHarnessAuditMode,
    runAudit,
    downloadBlueprint: downloadSecurityBlueprint,
    downloadPatch: downloadSecurityPatch,
    generatePatch: generateSecurityPatch,
    createPullRequest,
  } = useSecurityAudit();

  const {
    isAuditingHistory,
    historyLeaks,
    historySummary,
    scannedCommitsCount,
    historyAuditError,
    runHistoryAudit,
  } = useGitHistoryAudit();

  const totalCodeCount = useMemo(() => getAllCodeFiles(files).length, [files]);

  const parsedRepo = useMemo(() => {
    if (!repoUrl) return null;
    return parseGithubUrl(repoUrl);
  }, [repoUrl]);

  const handleRollbackComplete = async () => {
    if (repoUrl) {
      githubApi.clearCache();
      await analyzeRepository(repoUrl);
    }
  };

  // Effects
  useEffect(() => {
    if (!selectedFile && maximizedPanel === 'file') {
      setMaximizedPanel(null);
    }
    if (selectedFile && activeMobileTab === 'files') {
      setActiveMobileTab('preview');
    }
  }, [selectedFile, maximizedPanel, activeMobileTab]);

  useEffect(() => {
    if (repoError) {
      showToast(repoError, 'error', 4500);
    }
  }, [repoError, showToast]);

  // Handlers
  const handleAnalyze = async (url: string) => {
    const res = await analyzeRepository(url);
    if (res) {
      setActiveMobileTab('files');
    }
  };

  const handleFileSelect = async (path: string) => {
    await selectFile(path);
    setIsSidebarOpen(false);
    setActiveMobileTab('preview');
  };

  const handleRunSecurityAudit = async (scope: 'selected' | 'all' | 'single' = 'selected') => {
    if (!repoUrl) return;
    const projectName = repoUrl.split('github.com/')[1] || repoUrl;

    let targetPaths: string[] = [];

    if (scope === 'all') {
      targetPaths = getAuditableCodeFiles(files).map(f => f.path);
    } else if (scope === 'single') {
      if (selectedFile) {
        targetPaths = [selectedFile.path];
      } else {
        showToast('Nenhum arquivo aberto para auditar.', 'error');
        return;
      }
    } else {
      // 'selected' mode
      if (selectedPaths.size > 0) {
        targetPaths = Array.from(selectedPaths);
      } else if (selectedFile) {
        targetPaths = [selectedFile.path];
      } else {
        // Fallback: prompt user or audit all
        showToast('Selecione arquivos/pastas ou escolha "Todo o Projeto".', 'error');
        return;
      }
    }

    if (targetPaths.length === 0) {
      showToast('Nenhum ficheiro válido encontrado para auditar.', 'error');
      return;
    }

    setActiveMainPanel('security');
    setActiveMobileTab('chat');

    try {
      setAuditProgress({
        phase: 'fetching',
        current: 0,
        total: targetPaths.length,
        message: `A carregar 0 de ${targetPaths.length} ficheiros...`
      });

      const fetchedFiles = await fetchFilesByPaths(targetPaths, (done, total) => {
        setAuditProgress({
          phase: 'fetching',
          current: done,
          total,
          message: `A carregar ficheiros (${done}/${total})...`
        });
      });

      if (fetchedFiles.length === 0) {
        throw new Error('Não foi possível ler o conteúdo dos ficheiros selecionados.');
      }

      await runAudit(fetchedFiles, projectName, apiKeys[keyIndex]);
      showToast(`Auditoria concluída em ${fetchedFiles.length} ficheiro(s)!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Falha na auditoria de segurança.', 'error');
    }
  };

  const handleDownloadSecurityBlueprint = async () => {
    if (!repoUrl) return;
    const projectName = repoUrl.split('github.com/')[1] || repoUrl;
    const loadingToastId = showToast('Gerando blueprint de correcção...', 'loading', 0);
    try {
      await downloadSecurityBlueprint(projectName, apiKeys[keyIndex]);
      hideToast(loadingToastId);
      showToast('Blueprint de segurança gerado com sucesso!', 'success');
    } catch (err: any) {
      hideToast(loadingToastId);
      showToast(err.message || 'Falha ao gerar blueprint de segurança.', 'error');
    }
  };

  const handleDownloadSecurityPatch = async () => {
    if (!repoUrl) return;
    const projectName = repoUrl.split('github.com/')[1] || repoUrl;
    const loadingToastId = showToast('Gerando arquivo .patch de remediação...', 'loading', 0);
    try {
      await downloadSecurityPatch(projectName, apiKeys[keyIndex]);
      hideToast(loadingToastId);
      showToast('Arquivo .patch gerado com sucesso! Pronto para git apply.', 'success');
    } catch (err: any) {
      hideToast(loadingToastId);
      showToast(err.message || 'Falha ao gerar arquivo .patch.', 'error');
    }
  };

  const handleGenerateSecurityPatch = async () => {
    const projectName = repoUrl ? (repoUrl.split('github.com/')[1] || repoUrl) : 'project';
    return await generateSecurityPatch(projectName, apiKeys[keyIndex]);
  };

  const handleCreatePullRequest = async () => {
    if (!repoUrl) return;
    const parsed = parseGithubUrl(repoUrl);
    if (!parsed) {
      showToast('URL do repositório inválida.', 'error');
      return;
    }
    const { owner, repo } = parsed;
    const loadingToastId = showToast('Criando branch e abrindo Pull Request no GitHub...', 'loading', 0);
    try {
      const pr = await createPullRequest(owner, repo, branch, apiKeys[keyIndex]);
      hideToast(loadingToastId);
      showToast(`Pull Request #${pr.number} criado com sucesso no GitHub!`, 'success', 8000);
    } catch (err: any) {
      hideToast(loadingToastId);
      showToast(err.message || 'Falha ao abrir Pull Request no GitHub. Verifique se o GitHub Token possui permissões de gravação.', 'error', 8000);
    }
  };

  const handleClearRepository = () => {
    clearRepository();
    setViewMode('landing');
  };

  const handleSendMessage = async (msg: string) => {
    if (files.length > 0 && repoUrl) {
      const projectName = repoUrl.split('github.com/')[1] || repoUrl;

      // 1. Semantic search over repository files based on query
      const scoredMatches = findRelevantRepositoryFiles(files, msg, {
        activeFilePath: selectedFile?.path,
        selectedPaths,
        maxResults: 5
      });

      const targetPaths = scoredMatches.map(s => s.path);

      // 2. Resolve content for relevant files (use in-memory selectedFile when possible)
      let relevantFiles: { path: string; content: string }[] = [];
      if (selectedFile && targetPaths.includes(selectedFile.path)) {
        relevantFiles.push(selectedFile);
      }

      const pathsToFetch = targetPaths.filter(p => !relevantFiles.some(rf => rf.path === p));
      if (pathsToFetch.length > 0) {
        try {
          const fetched = await fetchFilesByPaths(pathsToFetch);
          relevantFiles = [...relevantFiles, ...fetched];
        } catch (err) {
          console.warn('Erro ao carregar arquivos semanticamente relevantes:', err);
        }
      }

      // 3. Compact structural tree overview (top 75 paths)
      const treeOverview = files
        .filter(f => f.type === 'blob')
        .slice(0, 75)
        .map(f => f.path);

      await sendMessage(msg, {
        relevantFiles,
        repoName: projectName,
        treeOverview,
        activeFile: selectedFile?.path
      });
    } else {
      await sendMessage(msg);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0a0a0a] text-gray-100 font-sans selection:bg-indigo-500/30">
      {(repoUrl || viewMode === 'workbench') && (
        <Header 
          apiKeys={apiKeys} 
          keyIndex={keyIndex} 
          onUploadKeys={handleKeyFileUpload} 
          onAddKeys={addApiKeys}
          onRemoveKey={removeApiKey}
          onClearKeys={clearApiKeys}
          onSelectKeyIndex={setActiveKeyIndex}
          onLogoClick={handleClearRepository}
        />
      )}
      
      <main className="flex-1 w-full p-0 overflow-hidden relative flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {!repoUrl ? (
            viewMode === 'landing' ? (
              <div key="landing-view" className="h-full overflow-y-auto">
                <LandingPage
                  onAnalyzeRepo={handleAnalyze}
                  isLoading={isRepoLoading}
                  onOpenWorkbenchDirectly={() => setViewMode('workbench')}
                />
              </div>
            ) : (
              <div key="workbench-input" className="h-full overflow-y-auto p-4 md:p-6">
                <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between">
                  <button
                    onClick={() => setViewMode('landing')}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                  >
                    ← Voltar para o Guia das 7 Brechas
                  </button>
                  <span className="text-xs text-gray-500 font-mono">Modo Workbench Ativo</span>
                </div>
                <RepoInput onAnalyze={handleAnalyze} isLoading={isRepoLoading} />
              </div>
            )
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "h-full p-3 md:p-5 min-h-0 overflow-hidden flex-1",
                maximizedPanel 
                  ? "flex flex-col" 
                  : "flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-5"
              )}
            >
              {/* Sidebar: File Tree (Desktop) */}
              <div className={cn(
                "bg-[#111] rounded-xl border border-white/10 p-4 h-full min-h-0 overflow-hidden flex-col transition-all duration-300",
                maximizedPanel 
                  ? "hidden" 
                  : (selectedFile ? "hidden lg:flex lg:col-span-3" : "hidden lg:flex lg:col-span-4")
              )}>
                <div className="mb-3 pb-3 border-b border-white/10 shrink-0">
                  <h2 className="font-semibold truncate text-sm" title={repoUrl}>{repoUrl.split('github.com/')[1]}</h2>
                  <div className="flex flex-col gap-2 mt-2">
                    <button 
                      onClick={handleClearRepository} 
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      ← Analisar outro / Ver Guia
                    </button>
                    <div className="mt-1 flex flex-col gap-1.5">
                      <button
                        onClick={() => {
                          setActiveMainPanel('security');
                          if (selectedPaths.size > 0) {
                            handleRunSecurityAudit('selected');
                          } else {
                            handleRunSecurityAudit('all');
                          }
                        }}
                        disabled={isAuditing}
                        className="w-full text-[11px] bg-red-600/15 hover:bg-red-600/25 active:bg-red-600/40 text-red-300 hover:text-white border border-red-500/30 hover:border-red-500/60 rounded-lg px-2 py-2 flex items-center justify-center gap-1.5 transition-all duration-150 hover:scale-[1.01] active:scale-[0.98] hover:shadow-md hover:shadow-red-500/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-medium"
                      >
                        {isAuditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
                        <span>Auditoria & Blueprint ({selectedPaths.size > 0 ? `${selectedPaths.size} sel.` : 'Tudo'})</span>
                      </button>

                      <button
                        onClick={() => setIsCommitHistoryOpen(true)}
                        className="w-full text-[11px] bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/25 hover:border-amber-500/50 rounded-lg px-2 py-1.5 flex items-center justify-center gap-1.5 transition-all duration-150 hover:scale-[1.01] active:scale-[0.98] cursor-pointer font-medium"
                        title="Ver histórico de commits e reverter versões anteriores"
                      >
                        <History className="w-3.5 h-3.5 text-amber-400" />
                        <span>Histórico & Rollback (Time Machine)</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <FileTree 
                    files={files} 
                    onSelect={handleFileSelect}
                    selectedPaths={selectedPaths}
                    onTogglePath={togglePathSelection}
                    onToggleFolder={toggleFolderSelection}
                    onSelectAll={selectAllPaths}
                    onDeselectAll={deselectAllPaths}
                    activeFilePath={selectedFile?.path}
                    onRunAuditWithSelection={() => handleRunSecurityAudit('selected')}
                  />
                </div>
              </div>

              {/* Mobile Sidebar Overlay */}
              <AnimatePresence>
                {isSidebarOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsSidebarOpen(false)}
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
                    />
                    <motion.div 
                      initial={{ x: '-100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '-100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="fixed left-0 top-0 bottom-0 w-[85%] max-w-sm bg-[#111] z-[61] p-4 border-r border-white/10 flex flex-col lg:hidden"
                    >
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10 shrink-0">
                        <span className="font-bold text-indigo-400 text-sm">Explorador de Arquivos</span>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-white/5 rounded cursor-pointer">
                          <CloseIcon className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="mb-4 space-y-2 shrink-0">
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <h2 className="font-semibold truncate text-xs text-gray-300 mb-2" title={repoUrl}>
                            {repoUrl.split('github.com/')[1]}
                          </h2>
                          <div className="flex flex-col gap-2">
                            <button 
                              onClick={clearRepository} 
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 py-1 cursor-pointer"
                            >
                              ← Analisar outro
                            </button>
                            <div className="mt-1 flex flex-col gap-1.5">
                              <button
                                onClick={() => {
                                  setIsSidebarOpen(false);
                                  handleRunSecurityAudit(selectedPaths.size > 0 ? 'selected' : 'all');
                                }}
                                disabled={isAuditing}
                                className="w-full text-xs bg-red-600/15 hover:bg-red-600/25 active:bg-red-600/40 text-red-300 hover:text-white border border-red-500/30 hover:border-red-500/60 rounded-lg px-2 py-2 flex items-center justify-center gap-1.5 transition-all duration-150 hover:scale-[1.01] active:scale-[0.98] hover:shadow-md hover:shadow-red-500/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-medium"
                              >
                                {isAuditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
                                <span>Auditoria & Blueprint ({selectedPaths.size > 0 ? `${selectedPaths.size} sel.` : 'Tudo'})</span>
                              </button>

                              <button
                                onClick={() => {
                                  setIsSidebarOpen(false);
                                  setIsCommitHistoryOpen(true);
                                }}
                                className="w-full text-xs bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/25 hover:border-amber-500/50 rounded-lg px-2 py-1.5 flex items-center justify-center gap-1.5 transition-all duration-150 hover:scale-[1.01] active:scale-[0.98] cursor-pointer font-medium"
                              >
                                <History className="w-3.5 h-3.5 text-amber-400" />
                                <span>Histórico & Rollback</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        <FileTree 
                          files={files} 
                          onSelect={handleFileSelect}
                          selectedPaths={selectedPaths}
                          onTogglePath={togglePathSelection}
                          onToggleFolder={toggleFolderSelection}
                          onSelectAll={selectAllPaths}
                          onDeselectAll={deselectAllPaths}
                          activeFilePath={selectedFile?.path}
                          onRunAuditWithSelection={() => {
                            setIsSidebarOpen(false);
                            handleRunSecurityAudit('selected');
                          }}
                        />
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Main Content: Chat & Analysis */}
              <div className={cn(
                "h-full min-h-0 flex-col gap-3 transition-all duration-300 pb-16 lg:pb-0 overflow-hidden flex-1",
                maximizedPanel === 'chat' 
                  ? "flex lg:col-span-12" 
                  : maximizedPanel === 'file' 
                    ? "hidden" 
                    : (selectedFile 
                        ? (activeMobileTab === 'chat' ? "flex lg:flex lg:col-span-5" : "hidden lg:flex lg:col-span-5")
                        : "flex lg:col-span-8")
              )}>
                {maximizedPanel !== 'file' && (
                  <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
                    <div className="flex gap-1 bg-[#111] border border-white/10 rounded-lg p-1 w-fit shrink-0">
                      <button
                        onClick={() => setActiveMainPanel('chat')}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer",
                          activeMainPanel === 'chat' ? "bg-indigo-600/20 text-indigo-300 font-medium" : "text-gray-400 hover:text-white"
                        )}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat
                      </button>
                      <button
                        onClick={() => setActiveMainPanel('security')}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer",
                          activeMainPanel === 'security' ? "bg-red-600/20 text-red-300 font-medium" : "text-gray-400 hover:text-white"
                        )}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                        Segurança
                        {auditResult && (
                          <span className={cn(
                            "text-[10px] font-semibold px-1.5 rounded-full",
                            auditResult.score >= 85 ? "bg-green-500/20 text-green-400" : auditResult.score >= 70 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                          )}>
                            {auditResult.score}
                          </span>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => setIsCommitHistoryOpen(true)}
                      className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 font-medium"
                      title="Histórico de Versões e Reversão (Time Machine)"
                    >
                      <History className="w-3.5 h-3.5 text-amber-400" />
                      <span>Reverter Commits</span>
                    </button>
                  </div>
                )}

                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  {activeMainPanel === 'chat' ? (
                    <ChatInterface
                      messages={chatHistory}
                      onSendMessage={handleSendMessage}
                      isThinking={isThinking}
                      isMaximized={maximizedPanel === 'chat'}
                      onToggleMaximize={() => setMaximizedPanel(prev => prev === 'chat' ? null : 'chat')}
                      activeFileName={selectedFile?.path}
                      repoName={parsedRepo ? `${parsedRepo.owner}/${parsedRepo.repo}` : undefined}
                      totalFilesCount={totalCodeCount}
                      onOpenFile={handleFileSelect}
                      availableFiles={files}
                      isHarnessMode={isHarnessMode}
                      onToggleHarnessMode={toggleHarnessMode}
                    />
                  ) : (
                    <SecurityAuditPanel
                      isAuditing={isAuditing}
                      auditProgress={auditProgress}
                      auditResult={auditResult}
                      blueprintMarkdown={blueprintMarkdown}
                      patchContent={patchContent}
                      auditError={auditError}
                      isGeneratingBlueprint={isGeneratingSecurityBlueprint}
                      isGeneratingPatch={isGeneratingSecurityPatch}
                      isCreatingPR={isCreatingPR}
                      createdPR={createdPR}
                      onRunAudit={handleRunSecurityAudit}
                      onDownloadBlueprint={handleDownloadSecurityBlueprint}
                      onDownloadPatch={handleDownloadSecurityPatch}
                      onGeneratePatch={handleGenerateSecurityPatch}
                      onCreatePullRequest={handleCreatePullRequest}
                      isMaximized={maximizedPanel === 'chat'}
                      onToggleMaximize={() => setMaximizedPanel(prev => prev === 'chat' ? null : 'chat')}
                      selectedCount={selectedPaths.size}
                      totalCodeCount={totalCodeCount}
                      currentFileName={selectedFile?.path}
                      lastAuditedFiles={lastContextFiles}
                      onOpenFile={handleFileSelect}
                      isHarnessMode={isHarnessAuditMode}
                      onToggleHarnessMode={toggleHarnessAuditMode}
                      owner={parsedRepo?.owner}
                      repo={parsedRepo?.repo}
                      branch={branch}
                      isAuditingHistory={isAuditingHistory}
                      historyLeaks={historyLeaks}
                      historySummary={historySummary}
                      scannedCommitsCount={scannedCommitsCount}
                      historyAuditError={historyAuditError}
                      onRunHistoryAudit={(max) => {
                        if (parsedRepo) {
                          runHistoryAudit({ owner: parsedRepo.owner, repo: parsedRepo.repo, branch, maxCommits: max || 50 });
                        }
                      }}
                      onSelectCommitForRollback={(sha) => {
                        setIsCommitHistoryOpen(true);
                      }}
                    />
                  )}
                </div>
              </div>

              {/* File Preview Pane */}
              <AnimatePresence>
                {selectedFile && (maximizedPanel === 'file' || !maximizedPanel) && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "h-full min-h-0 flex-col overflow-hidden pb-16 lg:pb-0 flex-1",
                      maximizedPanel === 'file' 
                        ? "flex lg:col-span-12" 
                        : (activeMobileTab === 'preview' ? "flex lg:col-span-4" : "hidden lg:flex lg:col-span-4")
                    )}
                  >
                    <FileViewer 
                      file={selectedFile} 
                      onClose={() => setSelectedFile(null)} 
                      isMaximized={maximizedPanel === 'file'}
                      onToggleMaximize={() => setMaximizedPanel(prev => prev === 'file' ? null : 'file')}
                      onBack={navigateBack}
                      onForward={navigateForward}
                      canGoBack={currentHistoryIndex > 0}
                      canGoForward={currentHistoryIndex < fileHistory.length - 1}
                      isSelectedForAudit={selectedPaths.has(selectedFile.path)}
                      onToggleAuditSelection={() => togglePathSelection(selectedFile.path)}
                      onAuditSingleFile={() => handleRunSecurityAudit('single')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mobile Navigation Bar */}
              <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#111] border-t border-white/10 flex items-center justify-around px-4 lg:hidden z-50">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Menu className="w-5 h-5" />
                  <span className="text-[10px]">Menu</span>
                </button>
                <button 
                  onClick={() => setActiveMobileTab('chat')}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-colors cursor-pointer",
                    activeMobileTab === 'chat' ? "text-indigo-400" : "text-gray-400"
                  )}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-[10px]">Chat</span>
                </button>
                {selectedFile && (
                  <button 
                    onClick={() => setActiveMobileTab('preview')}
                    className={cn(
                      "flex flex-col items-center gap-1 transition-colors cursor-pointer",
                      activeMobileTab === 'preview' ? "text-indigo-400" : "text-gray-400"
                    )}
                  >
                    <Eye className="w-5 h-5" />
                    <span className="text-[10px]">Preview</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modal de Histórico de Commits e Rollback */}
      {parsedRepo && (
        <CommitHistoryModal
          isOpen={isCommitHistoryOpen}
          onClose={() => setIsCommitHistoryOpen(false)}
          owner={parsedRepo.owner}
          repo={parsedRepo.repo}
          branch={branch}
          onRollbackComplete={handleRollbackComplete}
        />
      )}
    </div>
  );
}
