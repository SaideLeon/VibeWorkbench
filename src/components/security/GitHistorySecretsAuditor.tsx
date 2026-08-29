import { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  History,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Trash2,
  Terminal,
  Key,
  Database,
  Lock,
  Search,
  Filter,
  FileCode,
  Flame,
  Info,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  RefreshCw,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { HistoryLeakItem, HistoryAuditSummary } from '@/hooks/useGitHistoryAudit';
import { githubApi } from '@/services/github.api';
import { cn } from '@/lib/utils';

interface GitHistorySecretsAuditorProps {
  owner: string;
  repo: string;
  branch?: string;
  isAuditing: boolean;
  leaks: HistoryLeakItem[];
  summary: HistoryAuditSummary | null;
  scannedCommitsCount: number;
  error: string | null;
  onRunAudit: (maxCommits?: number) => void;
  onSelectCommitForRollback?: (sha: string) => void;
}

interface SecretValidationStatus {
  isLoading: boolean;
  isValid?: boolean;
  statusText?: string;
  httpStatus?: number;
  testedAt?: string;
}

export const GitHistorySecretsAuditor = ({
  owner,
  repo,
  branch = 'main',
  isAuditing,
  leaks,
  summary,
  scannedCommitsCount,
  error,
  onRunAudit,
  onSelectCommitForRollback,
}: GitHistorySecretsAuditorProps) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>('ALL');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [activeStepTab, setActiveStepTab] = useState<'scan' | 'rotate' | 'purge' | 'patterns'>('scan');
  const [selectedCommitFilter, setSelectedCommitFilter] = useState<string | null>(null);
  const [purgeMethod, setPurgeMethod] = useState<'replace-text' | 'invert-paths' | 'bfg'>('replace-text');
  const [validationStatuses, setValidationStatuses] = useState<Record<string, SecretValidationStatus>>({});
  const [isValidatingAll, setIsValidatingAll] = useState(false);

  const handleCopyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  // Filtragem dinâmica de vazamentos com barra de pesquisa
  const filteredLeaks = useMemo(() => {
    return leaks.filter((leak) => {
      if (selectedProviderFilter !== 'ALL' && leak.provider !== selectedProviderFilter) {
        return false;
      }
      if (selectedSeverityFilter !== 'ALL' && leak.severity !== selectedSeverityFilter) {
        return false;
      }
      if (selectedCommitFilter && leak.commitSha !== selectedCommitFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesProvider = leak.provider.toLowerCase().includes(query);
        const matchesPattern = leak.patternName.toLowerCase().includes(query);
        const matchesFile = leak.filePath.toLowerCase().includes(query);
        const matchesCommit = leak.commitShortSha.toLowerCase().includes(query) || leak.commitSha.toLowerCase().includes(query);
        const matchesMessage = leak.commitMessage.toLowerCase().includes(query);
        const matchesAuthor = leak.author.name.toLowerCase().includes(query);
        const matchesSnippet = leak.lineSnippet.toLowerCase().includes(query);
        return matchesProvider || matchesPattern || matchesFile || matchesCommit || matchesMessage || matchesAuthor || matchesSnippet;
      }
      return true;
    });
  }, [leaks, selectedProviderFilter, selectedSeverityFilter, selectedCommitFilter, searchQuery]);

  const uniqueProviders = useMemo(() => {
    return Array.from(new Set(leaks.map((l) => l.provider)));
  }, [leaks]);

  // Lista única de arquivos afetados
  const leakFilePaths = useMemo(() => {
    return Array.from(new Set(leaks.map((l) => l.filePath)));
  }, [leaks]);

  // Mapeamento de substituição para git-filter-repo --replace-text
  const replaceTextContent = useMemo(() => {
    const lines: string[] = [
      '# Arquivo de Regras de Substituição para git filter-repo',
      '# Formato: valor_sensivel===>[NOVO_VALOR_SEGURO]',
      '# Gerado automaticamente pelo Auditor de Histórico do Git',
      '',
    ];

    const seenSecrets = new Set<string>();
    for (const leak of leaks) {
      const secretToReplace = leak.rawSecret || leak.maskedSecret;
      if (secretToReplace && !seenSecrets.has(secretToReplace)) {
        seenSecrets.add(secretToReplace);
        lines.push(`${secretToReplace}===>[EXPURGED_${leak.provider.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_KEY_REVOKED]`);
      }
    }

    if (seenSecrets.size === 0) {
      lines.push('# Nenhum secret detectado para substituição direta');
    }

    return lines.join('\n');
  }, [leaks]);

  // Gerador de comandos de purga
  const gitFilterRepoReplaceCommand = `git filter-repo --replace-text replace-secrets.txt --force`;
  const gitFilterRepoInvertCommand = `git filter-repo --invert-paths ${leakFilePaths.map((p) => `--path "${p}"`).join(' ')} --force`;
  const bfgCommand = `java -jar bfg.jar --delete-files "{${leakFilePaths.map((p) => p.split('/').pop()).join(',')}}"`;
  const gitReflogGcCommand = `git reflog expire --expire=now --all && git gc --prune=now --aggressive`;
  const gitForcePushCommand = `git push origin --force --all && git push origin --force --tags`;

  // Script completo para download (Linux/macOS)
  const fullBashPurgeScript = useMemo(() => {
    return `#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE EXPURGO TOTAL DE SEGREDOS DO HISTÓRICO GIT
# Repositório: ${owner}/${repo}
# Total de Segredos Detectados: ${leaks.length}
# ==============================================================================
set -e

echo "🔒 [1/5] Criando backup de segurança (clone mirror)..."
cd ..
git clone --mirror https://github.com/${owner}/${repo}.git ${repo}-backup-mirror.git
cd ${repo}

echo "📝 [2/5] Gerando arquivo de substituição segura de tokens (replace-secrets.txt)..."
cat << 'EOF' > replace-secrets.txt
${replaceTextContent}
EOF

echo "⚡ [3/5] Executando git filter-repo para expurgar secrets de todos os commits e branches..."
if ! command -v git-filter-repo &> /dev/null; then
    echo "Instalando git-filter-repo via pip..."
    pip install git-filter-repo
fi

git filter-repo --replace-text replace-secrets.txt --force
${leakFilePaths.length > 0 ? `git filter-repo --invert-paths ${leakFilePaths.map((p) => `--path "${p}"`).join(' ')} --force` : ''}

echo "🧹 [4/5] Expirando reflog e forçando Garbage Collection agressivo..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "🚀 [5/5] Re-adicionando remote e forçando envio ao GitHub..."
git remote add origin https://github.com/${owner}/${repo}.git || true
echo "Para concluir a limpeza pública, execute:"
echo "git push origin --force --all && git push origin --force --tags"
echo "✅ Processo de expurgo concluído!"
`;
  }, [owner, repo, leaks, replaceTextContent, leakFilePaths]);

  // Script completo para download (Windows .bat)
  const fullBatPurgeScript = useMemo(() => {
    return `@echo off
REM ==============================================================================
REM SCRIPT DE EXPURGO TOTAL DE SEGREDOS DO HISTÓRICO GIT (WINDOWS)
REM Repositório: ${owner}/${repo}
REM Total de Segredos Detectados: ${leaks.length}
REM ==============================================================================
echo [1/5] Gerando arquivo de substituicao replace-secrets.txt...
(
${replaceTextContent.split('\n').map((line) => `echo ${line.replace(/[\^&<>|]/g, '^$&')}`).join('\n')}
) > replace-secrets.txt

echo [2/5] Executando git filter-repo...
git filter-repo --replace-text replace-secrets.txt --force

echo [3/5] Expirando reflog e limpando historico...
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo [4/5] Reconfigurando remote e concluindo...
git remote add origin https://github.com/${owner}/${repo}.git
echo Para enviar as alteracoes ao GitHub, execute:
echo git push origin --force --all ^&^& git push origin --force --tags
pause
`;
  }, [owner, repo, leaks, replaceTextContent]);

  // Ações de download
  const handleDownloadFile = (content: string, filename: string, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Testar status do secret no provedor (R03c Live Testing)
  const handleValidateSecret = async (leak: HistoryLeakItem, keyId: string) => {
    const secretValue = leak.rawSecret || leak.maskedSecret;
    if (!secretValue) return;

    setValidationStatuses((prev) => ({
      ...prev,
      [keyId]: { isLoading: true },
    }));

    try {
      const result = await githubApi.validateSecret(secretValue, leak.provider);
      setValidationStatuses((prev) => ({
        ...prev,
        [keyId]: {
          isLoading: false,
          isValid: result.valid,
          statusText: result.statusText,
          httpStatus: result.httpStatus,
          testedAt: result.testedAt,
        },
      }));
    } catch (err: any) {
      setValidationStatuses((prev) => ({
        ...prev,
        [keyId]: {
          isLoading: false,
          isValid: false,
          statusText: `Erro na validação: ${err.message}`,
        },
      }));
    }
  };

  // Testar todos os secrets encontrados
  const handleValidateAll = async () => {
    if (leaks.length === 0 || isValidatingAll) return;
    setIsValidatingAll(true);

    for (let i = 0; i < leaks.length; i++) {
      const leak = leaks[i];
      const keyId = `leak-${i}`;
      await handleValidateSecret(leak, keyId);
    }
    setIsValidatingAll(false);
  };

  return (
    <div className="bg-[#121214] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Header Banner */}
      <div className="p-4 bg-gradient-to-r from-[#18181b] via-[#1c1424] to-[#18181b] border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm md:text-base font-bold text-gray-100 flex items-center gap-2">
                Scanner & Central de Expurgo de Segredos do Git
              </h3>
              <span className="text-[10px] bg-red-500/20 text-red-300 font-semibold px-2 py-0.5 rounded-full border border-red-500/30">
                18+ Provedores • Google AI (AIza/AQ.) • Expurgo com git-filter-repo
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Varre cada commit desde a origem procurando credenciais vazadas e gera scripts de substituição e expurgo imediato para limpar o repositório no GitHub.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {leaks.length > 0 && (
            <button
              onClick={handleValidateAll}
              disabled={isValidatingAll || isAuditing}
              className="text-xs font-medium bg-white/10 hover:bg-white/15 text-gray-200 border border-white/15 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Testar requisições para verificar se as chaves ainda estão ativas nos provedores"
            >
              {isValidatingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
              ) : (
                <Key className="w-3.5 h-3.5 text-orange-400" />
              )}
              <span>{isValidatingAll ? 'Validando...' : 'Testar Status (R03c)'}</span>
            </button>
          )}

          <button
            onClick={() => onRunAudit(50)}
            disabled={isAuditing}
            className="text-xs font-semibold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-md shadow-red-950/40 disabled:opacity-50 cursor-pointer"
          >
            {isAuditing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Varrendo histórico commit a commit...</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4" />
                <span>Auditar Histórico</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs de Fluxo: 1. Achados & Busca -> 2. Rotação Obrigatória (R03c) -> 3. Expurgo Definitivo -> 4. Padrões Suportados */}
      <div className="flex border-b border-white/10 bg-[#151518] px-4 pt-2 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveStepTab('scan')}
          className={cn(
            'px-3.5 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer',
            activeStepTab === 'scan'
              ? 'border-red-500 text-red-300 bg-red-500/10 rounded-t-lg'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          )}
        >
          <Search className="w-3.5 h-3.5 text-red-400" />
          <span>1. Busca & Achados ({leaks.length})</span>
        </button>

        <button
          onClick={() => setActiveStepTab('rotate')}
          className={cn(
            'px-3.5 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer',
            activeStepTab === 'rotate'
              ? 'border-orange-500 text-orange-300 bg-orange-500/10 rounded-t-lg'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          )}
        >
          <Key className="w-3.5 h-3.5 text-orange-400" />
          <span>2. Rotação no Provedor (R03c)</span>
          {leaks.length > 0 && (
            <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.2 rounded-full font-bold">
              Urgente
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveStepTab('purge')}
          className={cn(
            'px-3.5 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer',
            activeStepTab === 'purge'
              ? 'border-purple-500 text-purple-300 bg-purple-500/10 rounded-t-lg'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          )}
        >
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span>3. Expurgo & Scripts de Limpeza</span>
          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded-full font-semibold">
            Automático
          </span>
        </button>

        <button
          onClick={() => setActiveStepTab('patterns')}
          className={cn(
            'px-3.5 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer',
            activeStepTab === 'patterns'
              ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          )}
        >
          <FileCode className="w-3.5 h-3.5 text-indigo-400" />
          <span>Padrões de Reconhecimento</span>
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {/* Banner de Erro */}
        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div>
              <strong className="font-semibold">Erro na varredura do histórico:</strong> {error}
            </div>
          </div>
        )}

        {/* Estado: Carregando / Varrendo */}
        {isAuditing && (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3 bg-[#161619] rounded-xl border border-white/10">
            <Loader2 className="w-9 h-9 animate-spin text-red-400" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-gray-200">
                Auditoria de Histórico em Execução...
              </h4>
              <p className="text-xs text-gray-400 max-w-md">
                Analisando commits, diffs e patches procurando Google AI (AIza/AQ.), Stripe, AWS, Slack, SendGrid, Twilio, DBs e bot tokens.
              </p>
            </div>
          </div>
        )}

        {/* Estado: Sem Execução Anterior */}
        {!isAuditing && !summary && !error && (
          <div className="py-10 px-6 flex flex-col items-center justify-center text-center gap-3 bg-[#151518] rounded-xl border border-white/10">
            <History className="w-12 h-12 text-red-400/40" />
            <div className="max-w-lg space-y-2">
              <h4 className="text-sm font-semibold text-gray-200">
                Pronto para auditar todo o histórico de commits
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Hackers utilizam robôs automatizados para monitorar o GitHub 24/7. Mesmo que uma chave tenha sido apagada do código atual, ela permanece para sempre no histórico do Git se não for purgada.
              </p>
              <button
                onClick={() => onRunAudit(50)}
                className="mt-3 text-xs bg-red-600/25 hover:bg-red-600/35 text-red-200 border border-red-500/35 font-semibold px-4 py-2 rounded-lg inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Search className="w-4 h-4" />
                Iniciar Varredura Histórica
              </button>
            </div>
          </div>
        )}

        {/* Estado: Varredura Concluída - Resumo de Métricas */}
        {summary && !isAuditing && (
          <div className="space-y-4">
            {/* Cards de Métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#18181c] border border-white/10 rounded-xl p-3">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">Commits Analisados</div>
                <div className="text-2xl font-bold text-gray-100 mt-0.5">{scannedCommitsCount}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Histórico completo rastreado</div>
              </div>

              <div className={cn('border rounded-xl p-3', summary.totalLeaks > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30')}>
                <div className="text-[11px] uppercase tracking-wide text-gray-400">Total de Secrets Vazados</div>
                <div className={cn('text-2xl font-bold mt-0.5', summary.totalLeaks > 0 ? 'text-red-400' : 'text-emerald-400')}>
                  {summary.totalLeaks}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {summary.totalLeaks > 0 ? '⚠️ Ameaça no histórico' : '✅ Nenhum secret encontrado'}
                </div>
              </div>

              <div className="bg-[#18181c] border border-white/10 rounded-xl p-3">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">Locais Não Óbvios</div>
                <div className="text-2xl font-bold text-orange-400 mt-0.5">{summary.nonObviousCount}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">README, .json, .txt, seeds</div>
              </div>

              <div className="bg-[#18181c] border border-white/10 rounded-xl p-3">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">Provedores Comprometidos</div>
                <div className="text-2xl font-bold text-purple-400 mt-0.5">{Object.keys(summary.providers).length}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Google AI, Stripe, AWS, etc.</div>
              </div>
            </div>

            {/* TAB 1: BUSCA E LISTAGEM DE VAZAMENTOS */}
            {activeStepTab === 'scan' && (
              <div className="space-y-3">
                {/* Barra de Busca de Segredos em Tempo Real */}
                <div className="bg-[#18181c] border border-white/10 rounded-xl p-3 space-y-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar por provedor, padrão, arquivo, commit, autor ou código vazado..."
                      className="w-full bg-[#121214] border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-red-500/50"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filtros de Provedor e Severidade */}
                  <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                    <span className="text-gray-400 text-[11px] font-semibold flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Provedor:
                    </span>
                    <button
                      onClick={() => setSelectedProviderFilter('ALL')}
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                        selectedProviderFilter === 'ALL'
                          ? 'bg-white/15 text-white font-semibold'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      )}
                    >
                      Todos ({leaks.length})
                    </button>
                    {uniqueProviders.map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedProviderFilter(p)}
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                          selectedProviderFilter === p
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        )}
                      >
                        {p} ({summary.providers[p] || 0})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista de Vazamentos Filtrados */}
                {filteredLeaks.length === 0 ? (
                  <div className="p-8 bg-[#161619] border border-white/10 rounded-xl text-center">
                    <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <h5 className="text-sm font-semibold text-gray-200">
                      {searchQuery ? 'Nenhum resultado corresponde à busca' : 'Nenhum vazamento encontrado'}
                    </h5>
                    <p className="text-xs text-gray-400 mt-1">
                      {searchQuery ? 'Tente outros termos de busca ou limpe o filtro.' : `Os últimos ${scannedCommitsCount} commits estão limpos.`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredLeaks.map((leak, idx) => {
                      const keyId = `leak-${idx}`;
                      const validation = validationStatuses[keyId];

                      return (
                        <div
                          key={idx}
                          className="bg-[#161619] border border-red-500/20 hover:border-red-500/40 rounded-xl p-4 transition-colors space-y-3 shadow-md"
                        >
                          {/* Top Bar: Provedor + Severidade + Commit + Status de Validação */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded text-[11px] font-bold">
                                {leak.severity} • {leak.provider}
                              </span>
                              <span className="text-xs font-semibold text-gray-200">
                                {leak.patternName}
                              </span>
                              {leak.isNonObvious && (
                                <span className="bg-orange-500/15 text-orange-300 text-[10px] px-2 py-0.5 rounded border border-orange-500/25">
                                  {leak.fileType}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs font-mono">
                              <span className="text-gray-400">Commit:</span>
                              <a
                                href={`https://github.com/${owner}/${repo}/commit/${leak.commitSha}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                              >
                                {leak.commitShortSha} <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>

                          {/* Detalhes do Commit e Arquivo */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500 text-[11px] block">Mensagem do Commit:</span>
                              <span className="text-gray-300 font-medium line-clamp-2">
                                "{leak.commitMessage}"
                              </span>
                              <span className="text-[11px] text-gray-500 block mt-0.5">
                                Por {leak.author.name} {leak.author.date ? `em ${new Date(leak.author.date).toLocaleDateString()}` : ''}
                              </span>
                            </div>

                            <div>
                              <span className="text-gray-500 text-[11px] block">Arquivo & Linha de Inserção:</span>
                              <span className="text-gray-200 font-mono text-[11px]">
                                {leak.filePath}{leak.lineNumber ? `:${leak.lineNumber}` : ''}
                              </span>
                              <span className="text-[11px] text-red-400 block mt-0.5 font-mono">
                                Secret mascarado: <strong>{leak.maskedSecret}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Trecho do Diff */}
                          <div className="bg-[#0e0e10] border border-white/10 rounded-lg p-2.5 font-mono text-xs overflow-x-auto">
                            <div className="text-[10px] text-gray-500 mb-1 flex items-center justify-between">
                              <span>Diff no commit {leak.commitShortSha}:</span>
                              <button
                                onClick={() => handleCopyText(leak.lineSnippet, `snippet-${idx}`)}
                                className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                              >
                                {copiedItem === `snippet-${idx}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                <span>Copiar linha</span>
                              </button>
                            </div>
                            <div className="text-red-400 font-semibold select-all">
                              + {leak.lineSnippet}
                            </div>
                          </div>

                          {/* Feedback de Validação ao Vivo no Provedor */}
                          {validation && (
                            <div className={cn(
                              'p-2 rounded-lg text-xs flex items-center justify-between border',
                              validation.isValid
                                ? 'bg-red-500/15 border-red-500/30 text-red-300'
                                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            )}>
                              <div className="flex items-center gap-2">
                                {validation.isValid ? (
                                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                )}
                                <span>
                                  <strong>Status no Provedor:</strong> {validation.statusText}
                                </span>
                              </div>
                              {validation.httpStatus && (
                                <span className="text-[10px] font-mono opacity-70">
                                  HTTP {validation.httpStatus}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Botões de Ação Imediata */}
                          <div className="flex items-center justify-between pt-1 text-xs flex-wrap gap-2">
                            <div className="text-[11px] text-gray-400">
                              Regra: <strong className="text-gray-200">{leak.ruleId}</strong>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => handleValidateSecret(leak, keyId)}
                                disabled={validation?.isLoading}
                                className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-2.5 py-1 rounded text-xs border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Fazer uma requisição de teste para saber se a chave ainda está ativa"
                              >
                                {validation?.isLoading ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                                ) : (
                                  <RefreshCw className="w-3 h-3 text-orange-400" />
                                )}
                                <span>{validation?.isLoading ? 'Testando...' : 'Testar Status (R03c)'}</span>
                              </button>

                              {onSelectCommitForRollback && (
                                <button
                                  onClick={() => onSelectCommitForRollback(leak.commitSha)}
                                  className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-2.5 py-1 rounded text-xs border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Reverter repositório para o estado anterior a este commit"
                                >
                                  <RotateCcw className="w-3 h-3 text-orange-400" />
                                  <span>Reverter com Rollback</span>
                                </button>
                              )}

                              <button
                                onClick={() => setActiveStepTab('purge')}
                                className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Terminal className="w-3 h-3 text-purple-400" />
                                <span>Expurgar do Git</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: GUIA DE ROTAÇÃO OBRIGATÓRIA (R03c) */}
            {activeStepTab === 'rotate' && (
              <div className="bg-[#161619] border border-orange-500/30 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-300 flex items-center justify-center shrink-0 border border-orange-500/30">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                      Regra R03c: Remediação de Secret Vazado — Rotação Obrigatória
                    </h4>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      Apagar a secret do Git <strong>não invalida</strong> a credencial viva. Se o repositório foi clonado por bots de scraping, a chave já foi coletada. A rotação no console do provedor é mandatória.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="bg-[#0e0e11] border border-orange-500/20 rounded-xl p-3.5 space-y-2">
                    <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-300 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <h5 className="text-xs font-bold text-gray-200">Revogar Imediatamente no Provedor</h5>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Acesse o painel oficial (Google AI Studio / GCP Console, Stripe Dashboard, AWS IAM Console, Mercado Pago Developer, Anthropic Console, Slack App Dashboard, MongoDB Atlas) e <strong>revogue/exclua</strong> a credencial antiga.
                    </p>
                  </div>

                  <div className="bg-[#0e0e11] border border-orange-500/20 rounded-xl p-3.5 space-y-2">
                    <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-300 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <h5 className="text-xs font-bold text-gray-200">Configurar Nova Chave em .env Seguro</h5>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Configure a nova chave exclusivamente em variáveis de ambiente fora do versionamento (<code className="text-orange-300">.env</code> listado no <code className="text-orange-300">.gitignore</code>) ou em secrets do provedor de deploy (Vercel, Cloud Run).
                    </p>
                  </div>

                  <div className="bg-[#0e0e11] border border-orange-500/20 rounded-xl p-3.5 space-y-2">
                    <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-300 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <h5 className="text-xs font-bold text-gray-200">Validar Erro 401 na Chave Antiga</h5>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Use a aba <strong>1. Busca & Achados</strong> e clique em <em>Testar Status</em> para confirmar que a chave antiga retorna <strong>401 Unauthorized</strong> ou <strong>403 Forbidden</strong> antes de avançar para a purga do Git.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setActiveStepTab('purge')}
                    className="text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Avançar para Passo 3: Expurgo & Scripts de Limpeza</span>
                    <Terminal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: EXPURGO DEFINITIVO & SCRIPTS AUTOMATIZADOS */}
            {activeStepTab === 'purge' && (
              <div className="bg-[#161619] border border-purple-500/30 rounded-xl p-5 space-y-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/30">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                        Expurgar Definitivamente os Segredos do Histórico do Git
                      </h4>
                      <p className="text-xs text-gray-300 mt-1 leading-relaxed max-w-2xl">
                        Reescreve o histórico do Git substituindo todas as ocorrências de chaves vazadas por strings neutras em todos os commits, branches e tags sem quebrar o código.
                      </p>
                    </div>
                  </div>

                  {/* Botões de Download de Scripts Prontos */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleDownloadFile(fullBashPurgeScript, 'purge-secrets.sh')}
                      className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      title="Baixar script executável para Linux e macOS"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>purge-secrets.sh (Mac/Linux)</span>
                    </button>

                    <button
                      onClick={() => handleDownloadFile(fullBatPurgeScript, 'purge-secrets.bat')}
                      className="text-xs bg-white/10 hover:bg-white/15 text-gray-200 border border-white/15 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Baixar script executável para Windows"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>purge-secrets.bat (Windows)</span>
                    </button>

                    <button
                      onClick={() => handleDownloadFile(replaceTextContent, 'replace-secrets.txt')}
                      className="text-xs bg-white/5 hover:bg-white/10 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Baixar arquivo com a tabela de substituições para git filter-repo"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>replace-secrets.txt</span>
                    </button>
                  </div>
                </div>

                {/* Seletor de Método de Expurgo */}
                <div className="flex border-b border-white/10 pb-2 gap-2 text-xs">
                  <button
                    onClick={() => setPurgeMethod('replace-text')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer',
                      purgeMethod === 'replace-text'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    Método 1: Substituição de Strings (git filter-repo --replace-text)
                  </button>

                  <button
                    onClick={() => setPurgeMethod('invert-paths')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer',
                      purgeMethod === 'invert-paths'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    Método 2: Remoção Completa de Arquivos (--invert-paths)
                  </button>

                  <button
                    onClick={() => setPurgeMethod('bfg')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer',
                      purgeMethod === 'bfg'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    Método 3: BFG Repo-Cleaner
                  </button>
                </div>

                {/* Conteúdo do Método 1: git filter-repo --replace-text */}
                {purgeMethod === 'replace-text' && (
                  <div className="space-y-3">
                    <div className="bg-[#0e0e11] border border-white/10 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300">
                          Passo 1: Criar o arquivo replace-secrets.txt com as chaves a substituir
                        </span>
                        <button
                          onClick={() => handleCopyText(replaceTextContent, 'replace-text-content')}
                          className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-mono"
                        >
                          {copiedItem === 'replace-text-content' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedItem === 'replace-text-content' ? 'Copiado!' : 'Copiar replace-secrets.txt'}</span>
                        </button>
                      </div>

                      <pre className="bg-[#08080a] p-3 rounded-lg font-mono text-[11px] text-purple-300/90 overflow-x-auto max-h-36 border border-purple-500/20 whitespace-pre-wrap select-all">
                        {replaceTextContent}
                      </pre>
                    </div>

                    <div className="bg-[#0e0e11] border border-white/10 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300">
                          Passo 2: Executar git filter-repo no terminal do repositório
                        </span>
                        <button
                          onClick={() => handleCopyText(gitFilterRepoReplaceCommand, 'git-filter-replace-cmd')}
                          className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-mono"
                        >
                          {copiedItem === 'git-filter-replace-cmd' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedItem === 'git-filter-replace-cmd' ? 'Copiado!' : 'Copiar comando'}</span>
                        </button>
                      </div>

                      <div className="bg-[#08080a] p-3 rounded-lg font-mono text-xs text-purple-300 overflow-x-auto select-all border border-purple-500/20">
                        {gitFilterRepoReplaceCommand}
                      </div>
                    </div>
                  </div>
                )}

                {/* Conteúdo do Método 2: git filter-repo --invert-paths */}
                {purgeMethod === 'invert-paths' && (
                  <div className="bg-[#0e0e11] border border-white/10 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300">
                        Remover arquivos inteiros do histórico do Git
                      </span>
                      <button
                        onClick={() => handleCopyText(gitFilterRepoInvertCommand, 'git-filter-invert-cmd')}
                        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-mono"
                      >
                        {copiedItem === 'git-filter-invert-cmd' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedItem === 'git-filter-invert-cmd' ? 'Copiado!' : 'Copiar comando'}</span>
                      </button>
                    </div>

                    <div className="bg-[#08080a] p-3 rounded-lg font-mono text-xs text-purple-300 overflow-x-auto select-all border border-purple-500/20">
                      {gitFilterRepoInvertCommand}
                    </div>
                  </div>
                )}

                {/* Conteúdo do Método 3: BFG */}
                {purgeMethod === 'bfg' && (
                  <div className="bg-[#0e0e11] border border-white/10 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300">
                        Comando BFG Repo-Cleaner
                      </span>
                      <button
                        onClick={() => handleCopyText(bfgCommand, 'bfg-cleaner')}
                        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-mono"
                      >
                        {copiedItem === 'bfg-cleaner' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedItem === 'bfg-cleaner' ? 'Copiado!' : 'Copiar comando'}</span>
                      </button>
                    </div>

                    <div className="bg-[#08080a] p-3 rounded-lg font-mono text-xs text-purple-300 overflow-x-auto select-all border border-purple-500/20">
                      {bfgCommand}
                    </div>
                  </div>
                )}

                {/* Passo Final 1: Limpeza do Reflog e GC */}
                <div className="bg-[#0e0e11] border border-white/10 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300">
                      Passo de Limpeza: Expirar Reflog e Garbage Collector
                    </span>
                    <button
                      onClick={() => handleCopyText(gitReflogGcCommand, 'git-reflog-cmd')}
                      className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-mono"
                    >
                      {copiedItem === 'git-reflog-cmd' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedItem === 'git-reflog-cmd' ? 'Copiado!' : 'Copiar comando'}</span>
                    </button>
                  </div>

                  <div className="bg-[#08080a] p-3 rounded-lg font-mono text-xs text-purple-300 overflow-x-auto select-all border border-purple-500/20">
                    {gitReflogGcCommand}
                  </div>
                </div>

                {/* Passo Final 2: Force Push */}
                <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-300">
                      Passo Final Obrigatório: Forçar envio para o repositório remoto (Force Push)
                    </span>
                    <button
                      onClick={() => handleCopyText(gitForcePushCommand, 'git-force-push')}
                      className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer font-mono"
                    >
                      {copiedItem === 'git-force-push' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedItem === 'git-force-push' ? 'Copiado!' : 'Copiar comando'}</span>
                    </button>
                  </div>

                  <div className="bg-[#08080a] p-3 rounded-lg font-mono text-xs text-red-400 overflow-x-auto select-all border border-red-500/20">
                    {gitForcePushCommand}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Sobrescreve a árvore remota no GitHub, removendo os commits com secrets e invalidando os links de visualização pública anteriores.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: PADRÕES SUPORTADOS (18+ Provedores) */}
            {activeStepTab === 'patterns' && (
              <div className="bg-[#161619] border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-500/30">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-100">
                      Padrões de Reconhecimento Determinístico Ativos
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Regras de alta precisão baseadas no scanner de segurança integrado, cobrindo todos os formatos legados e modernos.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="bg-[#0e0e11] border border-white/5 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300">Google AI & Cloud (Gemini / GCP)</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">AIza... / AQ....</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Reconhece o formato clássico (<code className="text-gray-300">AIza...</code>) e o novo formato de chaves (<code className="text-gray-300">AQ....</code>) em transição pelo Google AI Studio.
                    </p>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/5 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300">Stripe API (Live & Test)</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">sk_live_ / rk_live_</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Detecta chaves de produção (<code className="text-gray-300">sk_live_</code>), chaves restritas (<code className="text-gray-300">rk_live_</code>) e de teste.
                    </p>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/5 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300">Slack API</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">xoxb- / xoxp- / xoxa-</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Detecta tokens OAuth de bots, usuários, workspaces e integrações de aplicativos do Slack.
                    </p>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/5 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300">SendGrid & Mailgun</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">SG.... / key-....</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Chaves de API para envio transacional de e-mails via SendGrid e Mailgun.
                    </p>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/5 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300">AWS Credentials</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">AKIA[0-9A-Z]&#123;16&#125;</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      AWS Access Key ID para controle de infraestrutura cloud na Amazon Web Services.
                    </p>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/5 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300">Twilio & Heroku & Facebook</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">SK... / AC... / EAAC...</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Credenciais de SMS/VoIP Twilio, chaves Heroku e Graph Access Tokens do Facebook.
                    </p>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/5 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300">Databases com Senhas Claras</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">mongodb:// / postgresql://</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      URIs de conexão com PostgreSQL, MongoDB, MySQL e Redis contendo usuário e senha em texto claro.
                    </p>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/5 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300">AI APIs (OpenAI & Anthropic)</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">sk-proj-... / sk-ant-...</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Chaves de API OpenAI (incluindo o formato recente <code className="text-gray-300">sk-proj-</code>) e Anthropic Claude (<code className="text-gray-300">sk-ant-</code>).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
