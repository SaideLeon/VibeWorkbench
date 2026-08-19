import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Github, 
  Search, 
  Loader2, 
  Lock, 
  Unlock, 
  Star, 
  GitFork, 
  RefreshCw, 
  Filter, 
  Key, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { githubApi } from '@/services/github.api';
import { AppLogo } from '@/components/ui/AppLogo';

export const RepoInput = ({ onAnalyze, isLoading }: { onAnalyze: (url: string) => void, isLoading: boolean }) => {
  const [url, setUrl] = useState('');
  const [userRepos, setUserRepos] = useState<any[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [showAllRepos, setShowAllRepos] = useState(false);

  // Direct Token Input state
  const [inputToken, setInputToken] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isTokenSectionExpanded, setIsTokenSectionExpanded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('github_token');
    setHasToken(!!token);
    if (token) {
      setInputToken(token);
      loadUserRepos();
    } else {
      // By default expand token section if no token is saved yet
      setIsTokenSectionExpanded(true);
    }
  }, []);

  const loadUserRepos = async () => {
    setIsLoadingRepos(true);
    setRepoError(null);
    try {
      const repos = await githubApi.getUserRepos();
      setUserRepos(repos);
    } catch (error: any) {
      console.error("Failed to load repos", error);
      setRepoError(error.message || "Falha ao buscar repositórios");
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleSaveManualToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const token = inputToken.trim();

    if (!token) {
      localStorage.removeItem('github_token');
      setHasToken(false);
      setUserRepos([]);
      setTokenStatus({ type: 'info', message: 'Token removido. Limite anônimo de 60 req/h ativo.' });
      window.dispatchEvent(new Event('github_token_updated'));
      setTimeout(() => setTokenStatus(null), 4000);
      return;
    }

    setIsSavingToken(true);
    setTokenStatus({ type: 'info', message: 'Validando token com a API do GitHub...' });

    try {
      const res = await fetch('/api/github/repos', {
        headers: { 'x-github-token': token }
      });

      if (res.ok) {
        localStorage.setItem('github_token', token);
        setHasToken(true);
        setTokenStatus({ type: 'success', message: 'Token validado e salvo com sucesso! Limite de 5.000 req/h ativado.' });
        window.dispatchEvent(new Event('github_token_updated'));
        loadUserRepos();
      } else {
        const data = await res.json().catch(() => ({}));
        const errMessage = data.error || `Erro ${res.status}: Token inválido ou sem permissões necessárias.`;
        setTokenStatus({ type: 'error', message: errMessage });
      }
    } catch (err: any) {
      setTokenStatus({ type: 'error', message: `Erro ao conectar com GitHub: ${err.message}` });
    } finally {
      setIsSavingToken(false);
      setTimeout(() => {
        if (tokenStatus?.type === 'success') {
          setTokenStatus(null);
        }
      }, 5000);
    }
  };

  const handleRemoveToken = () => {
    localStorage.removeItem('github_token');
    setInputToken('');
    setHasToken(false);
    setUserRepos([]);
    setRepoError(null);
    setTokenStatus({ type: 'info', message: 'Token removido com sucesso.' });
    window.dispatchEvent(new Event('github_token_updated'));
    setTimeout(() => setTokenStatus(null), 3000);
  };

  const handleConnectGithub = async () => {
    try {
      const res = await fetch('/api/github/auth/url');
      if (!res.ok) throw new Error('Falha ao obter URL de autenticação');
      const { url } = await res.json();
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        url,
        'github_auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (err) {
      console.error("Erro ao conectar GitHub:", err);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
        const token = event.data.token;
        localStorage.setItem('github_token', token);
        setInputToken(token);
        setHasToken(true);
        setTokenStatus({ type: 'success', message: 'Conectado via GitHub OAuth com sucesso!' });
        loadUserRepos();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const handleTokenUpdate = () => {
      const token = localStorage.getItem('github_token');
      setHasToken(!!token);
      if (token) {
        setInputToken(token);
        loadUserRepos();
      }
    };
    window.addEventListener('github_token_updated', handleTokenUpdate);
    return () => window.removeEventListener('github_token_updated', handleTokenUpdate);
  }, []);

  const filteredRepos = useMemo(() => {
    return userRepos.filter(repo => 
      repo.full_name.toLowerCase().includes(repoSearch.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(repoSearch.toLowerCase()))
    );
  }, [userRepos, repoSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onAnalyze(url);
  };

  const displayedRepos = showAllRepos ? filteredRepos : filteredRepos.slice(0, 6);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-8 max-w-5xl mx-auto w-full">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full space-y-8"
      >
        {/* Headline & Logo */}
        <div className="space-y-3 flex flex-col items-center">
          <AppLogo size="xl" showText={false} className="mb-2" />
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Workbench de Repositórios GitHub
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">
            Analise qualquer repositório público ou privado, explore a árvore de arquivos e execute auditorias completas de segurança.
          </p>
        </div>

        {/* Primary Repository Link Input Form */}
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto w-full">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-30 group-hover:opacity-50 transition duration-500 blur"></div>
            <div className="relative flex items-center bg-[#111] rounded-xl border border-white/10 p-1.5 md:p-2 shadow-2xl">
              <Github className="w-5 h-5 md:w-6 md:h-6 text-gray-400 ml-2 md:ml-3 shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Cole a URL do repositório (ex: https://github.com/usuario/projeto)..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 px-2 md:px-4 py-2 text-sm md:text-base min-w-0"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !url}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Analisar</span>
              </button>
            </div>
          </div>

          {/* Quick Examples */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-gray-500">
            <span>Exemplos rápidos:</span>
            <button 
              type="button"
              onClick={() => setUrl('https://github.com/facebook/react')} 
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              facebook/react
            </button>
            <button 
              type="button"
              onClick={() => setUrl('https://github.com/shadcn-ui/ui')} 
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              shadcn-ui/ui
            </button>
          </div>
        </form>

        {/* Dedicated GitHub Token & Authentication Area */}
        <div className="max-w-2xl mx-auto w-full text-left bg-[#111114] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          {/* Card Header */}
          <div 
            onClick={() => setIsTokenSectionExpanded(!isTokenSectionExpanded)}
            className="px-5 py-4 flex items-center justify-between border-b border-white/5 bg-[#141418] cursor-pointer hover:bg-white/5 transition-colors select-none"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasToken ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'}`}>
                <Key className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">Token &amp; Autenticação GitHub</h3>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${hasToken ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                    {hasToken ? '● Token Conectado' : 'Opcional (Modo Anônimo)'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {hasToken 
                    ? 'Limite de 5.000 requisições/h e acesso a repositórios privados ativado.' 
                    : 'Adicione seu Personal Access Token ou conecte via OAuth para aumentar o limite da API.'}
                </p>
              </div>
            </div>

            <button className="text-gray-400 hover:text-white p-1">
              {isTokenSectionExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Card Body */}
          <AnimatePresence initial={false}>
            {isTokenSectionExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-5 space-y-4"
              >
                {/* Form to insert token */}
                <form onSubmit={handleSaveManualToken} className="space-y-3">
                  <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                    <span>Personal Access Token (PAT)</span>
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
                    >
                      <span>Gerar token no GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type="password"
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                        placeholder="ghp_... ou github_pat_..."
                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="submit"
                        disabled={isSavingToken}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSavingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        <span>Salvar Token</span>
                      </button>

                      {hasToken && (
                        <button
                          type="button"
                          onClick={handleRemoveToken}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Remover token armazenado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Remover</span>
                        </button>
                      )}
                    </div>
                  </div>
                </form>

                {/* OAuth alternative button */}
                <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-gray-400">
                    Ou autentique-se com 1 clique usando OAuth:
                  </div>

                  <button
                    type="button"
                    onClick={handleConnectGithub}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-200 hover:text-white transition-all cursor-pointer"
                  >
                    <Github className="w-3.5 h-3.5" />
                    Conectar via GitHub OAuth
                  </button>
                </div>

                {/* Feedback status message */}
                {tokenStatus && (
                  <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    tokenStatus.type === 'success' 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                      : tokenStatus.type === 'error'
                      ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                      : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300'
                  }`}>
                    {tokenStatus.type === 'success' ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : tokenStatus.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    ) : (
                      <Key className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    )}
                    <span>{tokenStatus.message}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Repositories Section (when authenticated) */}
        {hasToken && (
          <div className="pt-6 border-t border-white/10 space-y-6 w-full text-left">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Github className="w-5 h-5 text-indigo-400" />
                  Seus Repositórios Conectados
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Clique em qualquer repositório para carregá-lo e abrir a árvore de arquivos e auditoria.
                </p>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Filtrar seus repositórios..."
                    className="w-full bg-[#111] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
                <button 
                  onClick={loadUserRepos}
                  disabled={isLoadingRepos}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                  title="Atualizar lista de repositórios"
                >
                  <RefreshCw className={repoSearch ? "" : (isLoadingRepos ? "animate-spin" : "") + " w-4 h-4"} />
                </button>
              </div>
            </div>
            
            {isLoadingRepos ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-gray-400 text-xs animate-pulse">Sincronizando repositórios com o GitHub...</p>
              </div>
            ) : repoError ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 text-center">
                <p className="text-red-400 text-xs font-medium max-w-md">{repoError}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button 
                    onClick={loadUserRepos}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    Tentar novamente
                  </button>
                  <button 
                    onClick={handleRemoveToken}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    Trocar Token
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-left">
                  <AnimatePresence mode="popLayout">
                    {displayedRepos.map((repo) => (
                      <motion.button
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={repo.id}
                        onClick={() => onAnalyze(repo.html_url)}
                        className="group flex flex-col gap-2.5 p-4 bg-[#111114] border border-white/5 hover:border-indigo-500/50 rounded-xl transition-all hover:bg-white/5 relative overflow-hidden text-left cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            {repo.private ? (
                              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            )}
                            <span className="font-semibold text-xs truncate text-gray-100 group-hover:text-indigo-300 transition-colors">
                              {repo.name}
                            </span>
                          </div>

                          <Search className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        
                        <p className="text-[11px] text-gray-400 line-clamp-2 h-7 leading-relaxed">
                          {repo.description || "Sem descrição informada"}
                        </p>
                        
                        <div className="flex items-center gap-3 text-[10px] font-medium text-gray-500 mt-auto pt-2 border-t border-white/5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            {repo.language || 'N/A'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500/50" />
                            {repo.stargazers_count}
                          </div>
                          <div className="flex items-center gap-1">
                            <GitFork className="w-3 h-3 text-gray-600" />
                            {repo.forks_count}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>

                {filteredRepos.length > 6 && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => setShowAllRepos(!showAllRepos)}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors py-2 px-4 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 cursor-pointer"
                    >
                      {showAllRepos ? "Mostrar menos" : `Ver todos os ${filteredRepos.length} repositórios`}
                    </button>
                  </div>
                )}

                {filteredRepos.length === 0 && !isLoadingRepos && (
                  <div className="py-12 text-center space-y-2">
                    <Github className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-400 text-xs font-medium">Nenhum repositório encontrado com esse filtro.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

