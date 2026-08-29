import { useState, useEffect } from 'react';
import { 
  History, 
  RotateCcw, 
  GitCommit, 
  Check, 
  Copy, 
  ExternalLink, 
  AlertTriangle, 
  Loader2, 
  X, 
  ShieldAlert, 
  ArrowLeft,
  Calendar,
  User,
  CheckCircle2,
  HelpCircle,
  Flame,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CommitItem, useGithubRollback } from '@/hooks/useGithubRollback';
import { useGitHistoryAudit } from '@/hooks/useGitHistoryAudit';
import { GitHistorySecretsAuditor } from '@/components/security/GitHistorySecretsAuditor';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface CommitHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  branch?: string;
  onRollbackComplete?: () => void;
  initialTab?: 'commits' | 'secrets_audit';
}

export const CommitHistoryModal = ({
  isOpen,
  onClose,
  owner,
  repo,
  branch = 'main',
  onRollbackComplete,
  initialTab = 'commits',
}: CommitHistoryModalProps) => {
  const { showToast } = useToast();
  const { commits, isLoadingCommits, isRollingBack, error, fetchCommits, rollbackToCommit } = useGithubRollback();
  const {
    isAuditingHistory,
    historyLeaks,
    historySummary,
    scannedCommitsCount,
    historyAuditError,
    runHistoryAudit,
  } = useGitHistoryAudit();
  
  const [modalTab, setModalTab] = useState<'commits' | 'secrets_audit'>(initialTab);
  const [selectedCommit, setSelectedCommit] = useState<CommitItem | null>(null);
  const [rollbackMode, setRollbackMode] = useState<'safe_revert' | 'force_reset'>('safe_revert');
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && owner && repo) {
      fetchCommits(owner, repo, branch);
      setSelectedCommit(null);
      setModalTab(initialTab);
    }
  }, [isOpen, owner, repo, branch, fetchCommits, initialTab]);

  const handleCopySha = async (sha: string) => {
    await navigator.clipboard.writeText(sha);
    setCopiedSha(sha);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  const handleExecuteRollback = async () => {
    if (!selectedCommit) return;

    try {
      const res = await rollbackToCommit({
        owner,
        repo,
        branch,
        targetSha: selectedCommit.sha,
        mode: rollbackMode,
      });

      showToast(res.message || 'Rollback concluído com sucesso!', 'success', 7000);
      setSelectedCommit(null);
      if (onRollbackComplete) {
        onRollbackComplete();
      }
    } catch (err: any) {
      showToast(err.message || 'Falha ao executar reversão de commit.', 'error', 8000);
    }
  };

  const handleRollbackFromSecretLeak = (targetSha: string) => {
    const commitFound = commits.find((c) => c.sha === targetSha);
    if (commitFound) {
      setSelectedCommit(commitFound);
      setModalTab('commits');
    } else {
      setSelectedCommit({
        sha: targetSha,
        shortSha: targetSha.substring(0, 7),
        message: `Commit ${targetSha.substring(0, 7)}`,
        author: { name: 'Histórico Git', avatar_url: null, date: null },
        html_url: `https://github.com/${owner}/${repo}/commit/${targetSha}`,
        isHead: false,
        parents: [],
      });
      setModalTab('commits');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Data desconhecida';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('pt-PT', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#121212] border border-white/15 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#181818]/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  Auditor & Gestor de Histórico Git
                  <span className="text-[11px] font-mono font-normal bg-white/10 text-gray-300 px-2 py-0.5 rounded-full border border-white/10">
                    {branch}
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Repositório: <strong className="text-gray-200">{owner}/{repo}</strong> • Proteção contra vazamentos passados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchCommits(owner, repo, branch);
                  if (modalTab === 'secrets_audit') {
                    runHistoryAudit({ owner, repo, branch, maxCommits: 50 });
                  }
                }}
                disabled={isLoadingCommits || isRollingBack || isAuditingHistory}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors disabled:opacity-50 cursor-pointer"
                title="Recarregar dados"
              >
                <RotateCcw className={`w-4 h-4 ${isLoadingCommits || isAuditingHistory ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                disabled={isRollingBack}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs inside Modal */}
          <div className="flex border-b border-white/10 bg-[#161618] px-4 pt-1 gap-2 shrink-0">
            <button
              onClick={() => setModalTab('commits')}
              className={cn(
                "px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer",
                modalTab === 'commits'
                  ? "border-amber-500 text-amber-300 bg-amber-500/10 rounded-t-lg"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              )}
            >
              <GitCommit className="w-3.5 h-3.5 text-amber-400" />
              <span>Linha do Tempo & Rollback ({commits.length})</span>
            </button>

            <button
              onClick={() => {
                setModalTab('secrets_audit');
                if (!historySummary && !isAuditingHistory) {
                  runHistoryAudit({ owner, repo, branch, maxCommits: 50 });
                }
              }}
              className={cn(
                "px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer",
                modalTab === 'secrets_audit'
                  ? "border-red-500 text-red-300 bg-red-500/10 rounded-t-lg"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              )}
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>Auditoria Determinística de Secrets (Sem IA)</span>
              {historyLeaks.length > 0 && (
                <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded-full font-bold">
                  {historyLeaks.length}
                </span>
              )}
            </button>
          </div>

          {/* Modal Tab 1: Commits Timeline & Rollback */}
          {modalTab === 'commits' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {isLoadingCommits && (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-sm font-medium">Buscando histórico de commits do GitHub...</p>
                </div>
              )}

              {!isLoadingCommits && error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Não foi possível carregar o histórico</p>
                    <p className="text-xs text-red-200/80 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {!isLoadingCommits && !error && commits.length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">
                  Nenhum commit encontrado para a branch "{branch}".
                </div>
              )}

              {!isLoadingCommits && !error && commits.length > 0 && !selectedCommit && (
                <div className="space-y-3">
                  <div className="text-xs text-gray-400 flex items-center justify-between pb-2 border-b border-white/10 font-medium">
                    <span>Linha do Tempo de Versões</span>
                    <span>{commits.length} commits recentes</span>
                  </div>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
                    {commits.map((commit, index) => {
                      const isHead = index === 0;

                      return (
                        <div
                          key={commit.sha}
                          className={`relative p-3.5 rounded-xl border transition-all ${
                            isHead
                              ? 'bg-emerald-950/20 border-emerald-500/30'
                              : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                          }`}
                        >
                          {/* Node marker */}
                          <div
                            className={`absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full border-2 ${
                              isHead
                                ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                : 'bg-[#181818] border-gray-500'
                            }`}
                          />

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isHead ? (
                                  <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> HEAD (Versão Atual)
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-medium bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                                    {index} commit{index > 1 ? 's' : ''} atrás
                                  </span>
                                )}
                                
                                <button
                                  onClick={() => handleCopySha(commit.sha)}
                                  className="font-mono text-xs text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Copiar SHA completo"
                                >
                                  {copiedSha === commit.sha ? (
                                    <Check className="w-3 h-3 text-green-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span>{commit.shortSha}</span>
                                </button>

                                <a
                                  href={commit.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-400 hover:text-white transition-colors"
                                  title="Abrir commit no GitHub"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>

                              <p className="text-sm font-medium text-gray-100 line-clamp-2">
                                {commit.message}
                              </p>

                              <div className="flex items-center gap-3 text-xs text-gray-400 pt-0.5">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-gray-500" />
                                  {commit.author.name}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-gray-500" />
                                  {formatDate(commit.author.date)}
                                </span>
                              </div>
                            </div>

                            {!isHead && (
                              <div className="shrink-0 pt-2 sm:pt-0">
                                <button
                                  onClick={() => setSelectedCommit(commit)}
                                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-200 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Reverter para cá</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Confirmation Screen */}
              {selectedCommit && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  <button
                    onClick={() => setSelectedCommit(null)}
                    disabled={isRollingBack}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar à lista de commits
                  </button>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-semibold text-amber-200">
                          Confirmar Reversão do Repositório
                        </h3>
                        <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                          Você está prestes a restaurar a branch <strong>{branch}</strong> para o estado exato do commit selecionado. Todas as alterações e códigos adicionados/removidos posteriormente serão revertidos para a versão limpa.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-black/40 rounded-lg border border-white/10 text-xs space-y-1 font-mono">
                      <div className="text-gray-300 font-semibold">{selectedCommit.message}</div>
                      <div className="text-gray-400 text-[11px]">
                        SHA: {selectedCommit.sha} • {selectedCommit.author.name} • {formatDate(selectedCommit.author.date)}
                      </div>
                    </div>
                  </div>

                  {/* Escolha de Modo de Reversão */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-300">
                      Método de Reversão:
                    </label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setRollbackMode('safe_revert')}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          rollbackMode === 'safe_revert'
                            ? 'bg-amber-500/15 border-amber-500/50 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-amber-300">Reversão Segura (Recomendado)</span>
                          <input
                            type="radio"
                            name="rollbackMode"
                            checked={rollbackMode === 'safe_revert'}
                            onChange={() => setRollbackMode('safe_revert')}
                            className="text-amber-500"
                          />
                        </div>
                        <p className="text-[11px] leading-relaxed text-gray-300">
                          Cria um novo commit restaurando 100% da árvore de ficheiros deste ponto no tempo. Funciona mesmo com proteção de branch ativa no GitHub.
                        </p>
                      </div>

                      <div
                        onClick={() => setRollbackMode('force_reset')}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          rollbackMode === 'force_reset'
                            ? 'bg-red-500/15 border-red-500/50 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-red-300">Reset Forçado (Force Reset)</span>
                          <input
                            type="radio"
                            name="rollbackMode"
                            checked={rollbackMode === 'force_reset'}
                            onChange={() => setRollbackMode('force_reset')}
                            className="text-red-500"
                          />
                        </div>
                        <p className="text-[11px] leading-relaxed text-gray-300">
                          Move o ponteiro da branch diretamente para o commit antigo (força a branch a voltar no tempo descartando os commits posteriores).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setSelectedCommit(null)}
                      disabled={isRollingBack}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>

                    <button
                      onClick={handleExecuteRollback}
                      disabled={isRollingBack}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-lg disabled:opacity-50"
                    >
                      {isRollingBack ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Revertendo Repositório...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4 text-white" />
                          <span>Executar Reversão Agora</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Modal Tab 2: Non-AI Deterministic Git History Secrets Scanner */}
          {modalTab === 'secrets_audit' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <GitHistorySecretsAuditor
                owner={owner}
                repo={repo}
                branch={branch}
                isAuditing={isAuditingHistory}
                leaks={historyLeaks}
                summary={historySummary}
                scannedCommitsCount={scannedCommitsCount}
                error={historyAuditError}
                onRunAudit={(max) => runHistoryAudit({ owner, repo, branch, maxCommits: max || 50 })}
                onSelectCommitForRollback={handleRollbackFromSecretLeak}
              />
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

