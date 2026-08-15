import React, { useState, useEffect } from 'react';
import { 
  ZapOff, 
  Clock, 
  Key, 
  RefreshCw, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { parseGeminiErrorInfo, ParsedQuotaError } from '@/utils/ai-errors';
import { cn } from '@/lib/utils';

interface GeminiQuotaNoticeProps {
  error: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
  compact?: boolean;
  className?: string;
}

export const GeminiQuotaNotice: React.FC<GeminiQuotaNoticeProps> = ({
  error,
  onRetry,
  isRetrying = false,
  compact = false,
  className,
}) => {
  const info: ParsedQuotaError = parseGeminiErrorInfo(error);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(
    info.retrySeconds && info.retrySeconds > 0 ? info.retrySeconds : null
  );
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Contador regressivo em tempo real para retryDelay
  useEffect(() => {
    if (info.retrySeconds && info.retrySeconds > 0) {
      setSecondsRemaining(info.retrySeconds);
    }
  }, [info.retrySeconds]);

  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const handleOpenSettings = () => {
    window.dispatchEvent(new CustomEvent('open_settings_modal'));
  };

  if (!info.isQuota) {
    return (
      <div className={cn("bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl text-xs flex items-start gap-3", className)}>
        <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
        <div className="space-y-1 flex-1">
          <span className="font-semibold text-red-200 block">{info.title}</span>
          <p className="text-red-300/90 leading-relaxed">{info.message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className={cn("w-3 h-3", isRetrying && "animate-spin")} />
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("bg-amber-950/30 border border-amber-500/30 text-amber-200 p-3.5 rounded-xl text-xs space-y-2.5", className)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <ZapOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Cota de IA Excedida</span>
          </div>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
            429 Rate Limit
          </span>
        </div>
        
        <p className="text-gray-300 text-[11px] leading-relaxed">
          {info.message}
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying || (secondsRemaining !== null && secondsRemaining > 0)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRetrying && "animate-spin")} />
              {secondsRemaining !== null && secondsRemaining > 0
                ? `Aguarde ${secondsRemaining}s`
                : 'Tentar novamente'}
            </button>
          )}
          <button
            onClick={handleOpenSettings}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-gray-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-indigo-400" />
            Adicionar Chave
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-gradient-to-b from-[#181313] via-[#141217] to-[#101014] border border-amber-500/30 rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden",
      className
    )}>
      {/* Glow decorativo sutil */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header com ícone e badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <ZapOff className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold text-amber-200 tracking-tight">
                {info.title}
              </h4>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Modelo: <span className="text-gray-300 font-mono font-medium">{info.modelName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            {info.quotaTypeLabel || 'Cota Esgotada'}
          </span>
        </div>
      </div>

      {/* Conteúdo explicativo */}
      <div className="py-4 space-y-3.5">
        <p className="text-xs md:text-sm text-gray-200 leading-relaxed">
          {info.message}
        </p>

        {/* Banner de contagem regressiva se existir */}
        {secondsRemaining !== null && secondsRemaining > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-200">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              <span>
                Liberação estimada em: <strong className="font-mono text-sm text-amber-300">{secondsRemaining}s</strong>
              </span>
            </div>
            <div className="text-[11px] text-amber-300/80">
              Aguardando renovação...
            </div>
          </div>
        )}

        {secondsRemaining === 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-300">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>O tempo de espera terminou. Já pode tentar novamente!</span>
          </div>
        )}

        {/* Orientações e alternativas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 space-y-1">
            <div className="font-semibold text-gray-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              1. Aguardar Renovação
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              As cotas gratuitas por minuto e diárias do Gemini renovam automaticamente.
            </p>
          </div>

          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 space-y-1">
            <div className="font-semibold text-gray-200 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              2. Usar Chave Própria
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Carregue um arquivo <code className="text-indigo-300 font-mono">.txt</code> com suas chaves nas configurações para rotação sem limites.
            </p>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
        <div className="flex flex-wrap items-center gap-2.5">
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying || (secondsRemaining !== null && secondsRemaining > 0)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium rounded-xl text-xs shadow-lg shadow-amber-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRetrying && "animate-spin")} />
              {isRetrying 
                ? 'Processando...' 
                : secondsRemaining !== null && secondsRemaining > 0 
                ? `Aguarde ${secondsRemaining}s para tentar` 
                : 'Tentar Novamente'}
            </button>
          )}

          <button
            onClick={handleOpenSettings}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl text-xs border border-white/10 transition-all cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-indigo-400" />
            Configurar Chaves API
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {info.docUrl && (
            <a
              href={info.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-amber-300 inline-flex items-center gap-1 transition-colors text-[11px]"
            >
              Ver limites no Google AI
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {info.raw && (
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-gray-500 hover:text-gray-300 inline-flex items-center gap-1 transition-colors text-[11px] cursor-pointer"
            >
              {showTechnicalDetails ? 'Ocultar detalhes' : 'Ver log técnico'}
              {showTechnicalDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Detalhes técnicos expansíveis */}
      {showTechnicalDetails && info.raw && (
        <div className="mt-3.5 p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-gray-400 overflow-x-auto max-h-36">
          <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Resposta Bruta do Servidor:</div>
          <pre className="whitespace-pre-wrap break-all leading-tight">{info.raw}</pre>
        </div>
      )}
    </div>
  );
};
