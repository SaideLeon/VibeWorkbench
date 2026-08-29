import { useState, useRef, useEffect } from 'react';
import { Settings, Upload, Key, Maximize, Minimize, Github, Trash2, Plus, Zap, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { AppLogo } from '@/components/ui/AppLogo';

interface HeaderProps {
  apiKeys: string[];
  keyIndex: number;
  onUploadKeys: (file: File) => Promise<number>;
  onAddKeys?: (keys: string[] | string) => number;
  onRemoveKey?: (index: number) => void;
  onClearKeys?: () => void;
  onSelectKeyIndex?: (index: number) => void;
  onLogoClick?: () => void;
}

export const Header = ({ 
  apiKeys = [], 
  keyIndex = 0, 
  onUploadKeys, 
  onAddKeys,
  onRemoveKey,
  onClearKeys,
  onSelectKeyIndex,
  onLogoClick 
}: HeaderProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [keyInputText, setKeyInputText] = useState('');
  const [keyInputStatus, setKeyInputStatus] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState('');
  const [githubStatus, setGithubStatus] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('github_token');
    if (token) setGithubToken(token);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatApiError = async (res: Response, fallbackMessage: string) => {
    try {
      const data = await res.json();
      const baseMessage = data.error || fallbackMessage;
      const details = data.details ? ` | detalhes: ${JSON.stringify(data.details)}` : '';
      const debugId = data.debugId ? ` | debugId: ${data.debugId}` : '';
      return `${baseMessage}${details}${debugId}`;
    } catch {
      return `${fallbackMessage} (${res.status} ${res.statusText})`;
    }
  };

  const handleSaveToken = async () => {
    if (githubToken.trim()) {
      const token = githubToken.trim();
      localStorage.setItem('github_token', token);

      try {
        setGithubStatus('Validando token...');
        const res = await fetch('/api/github/repos', {
          headers: { 'x-github-token': token }
        });

        if (res.ok) {
          setGithubStatus('Sucesso! Conectado ao GitHub.');
          window.dispatchEvent(new Event('github_token_updated'));
        } else {
          const errorMessage = await formatApiError(res, 'Erro ao validar token GitHub');
          setGithubStatus(`Erro: ${errorMessage}`);
        }
      } catch (err) {
        setGithubStatus(`Erro ao conectar com GitHub: ${err instanceof Error ? err.message : 'erro desconhecido'}`);
      }
      setTimeout(() => setGithubStatus(null), 7000);
    } else {
      localStorage.removeItem('github_token');
      setGithubStatus('Token removido.');
      setTimeout(() => setGithubStatus(null), 3000);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Erro ao alternar tela cheia:", err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const count = await onUploadKeys(file);
      setUploadStatus(`Sucesso! ${count} chave(s) carregada(s).`);
      setTimeout(() => setUploadStatus(null), 4000);
    } catch (err) {
      setUploadStatus("Erro ao carregar arquivo de chaves.");
      setTimeout(() => setUploadStatus(null), 4000);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddManualKeys = () => {
    if (!keyInputText.trim()) return;
    if (!onAddKeys) return;

    try {
      const count = onAddKeys(keyInputText);
      setKeyInputText('');
      setKeyInputStatus(`Sucesso! ${count} chave(s) adicionada(s) com prioridade.`);
      setTimeout(() => setKeyInputStatus(null), 4000);
    } catch (err: any) {
      setKeyInputStatus(err.message || 'Erro ao adicionar chaves.');
      setTimeout(() => setKeyInputStatus(null), 5000);
    }
  };

  const handleConnectGithub = async () => {
    try {
      const res = await fetch('/api/github/auth/url');
      if (!res.ok) {
        const errorMessage = await formatApiError(res, 'Falha ao obter URL de autenticação GitHub');
        throw new Error(errorMessage);
      }

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
      const message = err instanceof Error ? err.message : 'erro desconhecido';
      setGithubStatus(`Erro OAuth: ${message}`);
      console.error('Erro ao conectar GitHub:', err);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
        const token = event.data.token;
        localStorage.setItem('github_token', token);
        setGithubToken(token);
        window.dispatchEvent(new Event('github_token_updated'));
      }
    };
    const handleOpenSettings = () => {
      setIsSettingsOpen(true);
    };
    window.addEventListener('message', handleMessage);
    window.addEventListener('open_settings_modal', handleOpenSettings);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('open_settings_modal', handleOpenSettings);
    };
  }, []);

  return (
    <header className="border-b border-white/10 bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-50">
      <div className="w-full px-4 md:px-6 h-16 flex items-center justify-between">
        <button 
          onClick={onLogoClick}
          className="flex items-center hover:opacity-85 transition-opacity cursor-pointer text-left"
        >
          <AppLogo size="md" showText={true} />
        </button>
        
        <div className="flex items-center gap-3">
          {apiKeys.length > 0 && (
            <div 
              onClick={() => setIsSettingsOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono cursor-pointer hover:bg-emerald-500/15 transition-colors"
              title="Chave própria do usuário ativa com prioridade"
            >
              <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
              <span>Chave Pessoal Ativa ({apiKeys.length})</span>
            </div>
          )}

          <button 
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5 cursor-pointer"
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5 cursor-pointer"
            title="Gerenciar Chaves API"
          >
            <Settings className="w-5 h-5" />
            {apiKeys.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border border-[#0a0a0a]" />
            )}
          </button>
        </div>
      </div>

      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Configurações & Chaves de API"
      >
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
          {/* Prioritization Status Banner */}
          {apiKeys.length > 0 ? (
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <span>Prioridade Máxima Ativa: Chave Pessoal</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    {apiKeys.length} configurada(s)
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/80 mt-1 leading-relaxed">
                  Todas as suas auditorias, geração de blueprints, patches e consultas consom diretamente sua(s) chave(s) própria(s), eliminando limites de requisições por minuto (RPM) compartilhados e poupando custos do sistema.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
              <Key className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-blue-300">
                  Usando Chave Padrão do Sistema
                </div>
                <p className="text-[11px] text-blue-200/80 mt-1 leading-relaxed">
                  Adicione sua(s) chave(s) de API do Google Gemini (gratuita ou paga) abaixo para ter prioridade absoluta e contornar limitações de taxa de requisições.
                </p>
              </div>
            </div>
          )}

          {/* Direct Key Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-200 flex items-center justify-between">
              <span>Inserir Chave(s) Gemini API (Prioridade do Usuário)</span>
              <span className="text-[11px] text-gray-400 font-normal">Uma chave por linha ou separadas por vírgula</span>
            </label>
            <div className="space-y-2">
              <textarea
                value={keyInputText}
                onChange={(e) => setKeyInputText(e.target.value)}
                placeholder="Cole sua chave aqui (ex: AIzaSy...)"
                rows={2}
                className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-gray-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={handleAddManualKeys}
                  disabled={!keyInputText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar & Priorizar Chave</span>
                </button>
                {apiKeys.length > 0 && onClearKeys && (
                  <button
                    onClick={onClearKeys}
                    className="text-[11px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remover todas as chaves</span>
                  </button>
                )}
              </div>
            </div>
            {keyInputStatus && (
              <p className={`text-xs ${keyInputStatus.includes('Erro') ? 'text-red-400' : 'text-emerald-400'}`}>
                {keyInputStatus}
              </p>
            )}
          </div>

          {/* Key File Upload Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-200">Ou carregar arquivo de chaves (.txt)</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all group"
            >
              <Upload className="w-6 h-6 text-gray-500 group-hover:text-indigo-400 mb-1.5 transition-colors" />
              <span className="text-xs text-gray-400 group-hover:text-gray-300">Clique para selecionar arquivo .txt com múltiplas chaves</span>
              <span className="text-[10px] text-gray-600 mt-0.5">Rotação automática entre múltiplas contas</span>
            </div>
            <input 
              type="file" 
              accept=".txt" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              className="hidden"
            />
            {uploadStatus && (
              <p className={`text-xs ${uploadStatus.includes('Erro') ? 'text-red-400' : 'text-emerald-400'}`}>
                {uploadStatus}
              </p>
            )}
          </div>

          {/* Keys List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-200">Chaves Pessoais Carregadas</label>
              <span className="text-xs text-gray-500 font-mono">{apiKeys.length} chave(s)</span>
            </div>
            
            <div className="bg-[#111] rounded-lg border border-white/5 max-h-40 overflow-y-auto divide-y divide-white/5">
              {apiKeys.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500 italic">
                  Nenhuma chave pessoal adicionada. O sistema está usando a chave padrão.
                </div>
              ) : (
                apiKeys.map((key, i) => (
                  <div 
                    key={i} 
                    className={`px-3 py-2 flex items-center justify-between text-xs transition-colors ${i === keyIndex ? 'bg-indigo-500/10' : 'hover:bg-white/5'}`}
                  >
                    <div 
                      onClick={() => onSelectKeyIndex && onSelectKeyIndex(i)}
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      title="Clique para definir esta chave como ativa"
                    >
                      <Key className={`w-3.5 h-3.5 shrink-0 ${i === keyIndex ? 'text-emerald-400' : 'text-gray-500'}`} />
                      <span className="font-mono text-gray-300 text-[11px]">
                        {key.substring(0, 8)}...{key.substring(key.length - 4)}
                      </span>
                      {i === keyIndex && (
                        <span className="text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          ATIVA
                        </span>
                      )}
                    </div>
                    {onRemoveKey && (
                      <button
                        onClick={() => onRemoveKey(i)}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors rounded cursor-pointer"
                        title="Remover chave"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* GitHub Token Section */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-200">GitHub Token (Opcional)</label>
              <button 
                onClick={handleConnectGithub}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2 py-1 bg-indigo-500/10 rounded border border-indigo-500/20 transition-colors cursor-pointer"
              >
                <Github className="w-3 h-3" />
                OAuth
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="flex-1 bg-[#111] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handleSaveToken}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Salvar
              </button>
            </div>
            {githubStatus && (
              <p className={`text-xs ${githubStatus.includes('Erro') ? 'text-red-400' : 'text-emerald-400'}`}>
                {githubStatus}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </header>
  );
};
