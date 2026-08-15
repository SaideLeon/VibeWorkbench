import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, FileText, MessageSquare, Files, Eye, Menu, X as CloseIcon, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllCodeFiles } from '@/utils/file-selection';

// Components
import { Header } from '@/components/layout/Header';
import { RepoInput } from '@/components/layout/RepoInput';
import { FileTree } from '@/components/file-explorer/FileTree';
import { FileViewer } from '@/components/file-explorer/FileViewer';
import { ChatInterface } from '@/components/ai-chat/ChatInterface';
import { SecurityAuditPanel } from '@/components/security/SecurityAuditPanel';

// Hooks
import { useGithubRepository } from '@/hooks/useGithubRepository';
import { useAIChat } from '@/hooks/useAIChat';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';

import { useToast } from '@/components/ui/Toast';

type MobileTab = 'files' | 'chat' | 'preview';
type MainPanel = 'chat' | 'security';

export default function App() {
  const { showToast, hideToast } = useToast();
  const [maximizedPanel, setMaximizedPanel] = useState<'chat' | 'file' | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMainPanel, setActiveMainPanel] = useState<MainPanel>('chat');

  // Custom Hooks
  const {
    repoUrl,
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
    analysis,
    performInitialAnalysis,
    sendMessage,
    apiKeys,
    keyIndex,
    handleKeyFileUpload
  } = useAIChat();

  const {
    isAuditing,
    auditProgress,
    setAuditProgress,
    auditResult,
    blueprintMarkdown,
    auditError,
    isGeneratingBlueprint: isGeneratingSecurityBlueprint,
    lastContextFiles,
    runAudit,
    downloadBlueprint: downloadSecurityBlueprint,
  } = useSecurityAudit();

  const totalCodeCount = useMemo(() => getAllCodeFiles(files).length, [files]);

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
      showToast(repoError, 'error', 6000);
    }
  }, [repoError, showToast]);

  // Handlers
  const handleAnalyze = async (url: string) => {
    const res = await analyzeRepository(url, performInitialAnalysis);
    if (res) {
      setActiveMobileTab('chat');
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
      targetPaths = getAllCodeFiles(files).map(f => f.path);
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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0a0a0a] text-gray-100 font-sans selection:bg-indigo-500/30">
      <Header 
        apiKeys={apiKeys} 
        keyIndex={keyIndex} 
        onUploadKeys={handleKeyFileUpload} 
        onLogoClick={clearRepository}
      />
      
      <main className="flex-1 w-full p-0 md:p-6 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!repoUrl ? (
            <div className="h-full overflow-y-auto p-4 md:p-0">
              <RepoInput key="input" onAnalyze={handleAnalyze} isLoading={isRepoLoading} />
            </div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-full p-4 md:p-0"
            >
              {/* Sidebar: File Tree (Desktop) */}
              <div className={cn(
                "hidden lg:flex bg-[#111] rounded-xl border border-white/10 p-4 h-full overflow-hidden flex-col transition-all duration-300",
                maximizedPanel ? "hidden" : (selectedFile ? "lg:col-span-3" : "lg:col-span-4")
              )}>
                <div className="mb-4 pb-4 border-b border-white/10">
                  <h2 className="font-semibold truncate text-sm" title={repoUrl}>{repoUrl.split('github.com/')[1]}</h2>
                  <div className="flex flex-col gap-2 mt-2">
                    <button 
                      onClick={clearRepository} 
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      ← Analisar outro
                    </button>
                    <div className="mt-1">
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
                        className="w-full text-[11px] bg-red-600/15 hover:bg-red-600/25 text-red-300 border border-red-500/30 rounded-lg px-2 py-2 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer font-medium"
                      >
                        {isAuditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
                        <span>Auditoria & Blueprint ({selectedPaths.size > 0 ? `${selectedPaths.size} sel.` : 'Tudo'})</span>
                      </button>
                    </div>
                  </div>
                </div>

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
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                        <span className="font-bold text-indigo-400 text-sm">Explorador de Arquivos</span>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-white/5 rounded">
                          <CloseIcon className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="mb-4 space-y-2">
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <h2 className="font-semibold truncate text-xs text-gray-300 mb-2" title={repoUrl}>
                            {repoUrl.split('github.com/')[1]}
                          </h2>
                          <div className="flex flex-col gap-2">
                            <button 
                              onClick={clearRepository} 
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 py-1"
                            >
                              ← Analisar outro
                            </button>
                            <div className="mt-1">
                              <button
                                onClick={() => {
                                  setIsSidebarOpen(false);
                                  handleRunSecurityAudit(selectedPaths.size > 0 ? 'selected' : 'all');
                                }}
                                disabled={isAuditing}
                                className="w-full text-xs bg-red-600/15 hover:bg-red-600/25 text-red-300 border border-red-500/30 rounded-lg px-2 py-2 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer font-medium"
                              >
                                {isAuditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
                                <span>Auditoria & Blueprint ({selectedPaths.size > 0 ? `${selectedPaths.size} sel.` : 'Tudo'})</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-hidden flex flex-col">
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
                "h-full flex flex-col gap-4 transition-all duration-300 pb-16 lg:pb-0",
                maximizedPanel === 'chat' ? "lg:col-span-12" : (selectedFile ? "lg:col-span-5" : "lg:col-span-8"),
                maximizedPanel === 'file' ? "hidden" : (activeMobileTab !== 'chat' ? "hidden lg:flex" : "flex")
              )}>
                {repoError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">
                    Erro: {repoError}
                  </div>
                )}

                {maximizedPanel !== 'file' && (
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
                )}

                {activeMainPanel === 'chat' ? (
                  <ChatInterface
                    messages={chatHistory}
                    onSendMessage={sendMessage}
                    isThinking={isThinking}
                    isMaximized={maximizedPanel === 'chat'}
                    onToggleMaximize={() => setMaximizedPanel(prev => prev === 'chat' ? null : 'chat')}
                  />
                ) : (
                  <SecurityAuditPanel
                    isAuditing={isAuditing}
                    auditProgress={auditProgress}
                    auditResult={auditResult}
                    blueprintMarkdown={blueprintMarkdown}
                    auditError={auditError}
                    isGeneratingBlueprint={isGeneratingSecurityBlueprint}
                    onRunAudit={handleRunSecurityAudit}
                    onDownloadBlueprint={handleDownloadSecurityBlueprint}
                    isMaximized={maximizedPanel === 'chat'}
                    onToggleMaximize={() => setMaximizedPanel(prev => prev === 'chat' ? null : 'chat')}
                    selectedCount={selectedPaths.size}
                    totalCodeCount={totalCodeCount}
                    currentFileName={selectedFile?.path}
                    lastAuditedFiles={lastContextFiles}
                    onOpenFile={handleFileSelect}
                  />
                )}
              </div>

              {/* File Preview Pane */}
              <AnimatePresence>
                {selectedFile && (maximizedPanel === 'file' || !maximizedPanel) && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "h-full pb-16 lg:pb-0",
                      maximizedPanel === 'file' ? "lg:col-span-12" : "lg:col-span-4",
                      activeMobileTab !== 'preview' ? "hidden lg:block" : "block"
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
                  className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
                >
                  <Menu className="w-5 h-5" />
                  <span className="text-[10px]">Menu</span>
                </button>
                <button 
                  onClick={() => setActiveMobileTab('chat')}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-colors",
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
                      "flex flex-col items-center gap-1 transition-colors",
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
    </div>
  );
}
