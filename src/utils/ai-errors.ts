export interface ParsedQuotaError {
  isQuota: boolean;
  title: string;
  message: string;
  retrySeconds?: number;
  retryDelayText?: string;
  quotaMetric?: string;
  quotaTypeLabel?: string;
  modelName?: string;
  docUrl?: string;
  raw?: string;
}

/**
 * Normaliza e analisa erros retornados pelo Gemini SDK ou rotas de API.
 */
export function parseGeminiErrorInfo(rawError: unknown): ParsedQuotaError {
  const errorString = typeof rawError === 'string' 
    ? rawError 
    : (rawError instanceof Error ? rawError.message : JSON.stringify(rawError || ''));

  // Detecta se é erro de cota / rate limit (429, RESOURCE_EXHAUSTED, Quota exceeded)
  const isQuota = /429|RESOURCE_EXHAUSTED|Quota exceeded|rate-limits|generativelanguage\.googleapis\.com.*requests|quotaMetric|exceeded your current quota/i.test(errorString);

  if (!isQuota) {
    let cleanMessage = errorString;
    // Se for um JSON encapsulado em string, tenta extrair apenas o campo message
    try {
      const jsonMatch = errorString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error?.message) cleanMessage = parsed.error.message;
        else if (parsed.message) cleanMessage = parsed.message;
      }
    } catch {
      // Ignora erro de parse
    }

    return {
      isQuota: false,
      title: 'Erro na Operação',
      message: cleanMessage || 'Ocorreu um erro ao processar a solicitação com IA.',
      raw: errorString,
    };
  }

  // Tenta extrair dados estruturados se existirem no texto de erro
  let retrySeconds: number | undefined;
  let retryDelayText: string | undefined;
  let quotaMetric: string | undefined;
  let quotaId: string | undefined;
  let modelName: string | undefined;

  // 1. Extração via Regex para retryDelay (ex: "38s" ou "38.13s")
  const retryMatch = errorString.match(/retryDelay["']?\s*:\s*["']?(\d+(?:\.\d+)?)(s|m|h)?/i) 
    || errorString.match(/retry in\s+(\d+(?:\.\d+)?)\s*(s|sec|seconds)?/i);
  if (retryMatch) {
    const value = parseFloat(retryMatch[1]);
    const unit = retryMatch[2]?.toLowerCase() || 's';
    if (unit.startsWith('m')) {
      retrySeconds = Math.round(value * 60);
    } else if (unit.startsWith('h')) {
      retrySeconds = Math.round(value * 3600);
    } else {
      retrySeconds = Math.round(value);
    }
    retryDelayText = `${retrySeconds}s`;
  }

  // 2. Extração de modelo
  const modelMatch = errorString.match(/model["']?\s*:\s*["']?([a-zA-Z0-9\-_]+)/i);
  if (modelMatch) {
    modelName = modelMatch[1];
  }

  // 3. Extração de métrica de cota
  const metricMatch = errorString.match(/quotaMetric["']?\s*:\s*["']?([^"',\s]+)/i);
  if (metricMatch) {
    quotaMetric = metricMatch[1];
  }

  const quotaIdMatch = errorString.match(/quotaId["']?\s*:\s*["']?([^"',\s]+)/i);
  if (quotaIdMatch) {
    quotaId = quotaIdMatch[1];
  }

  // Determinar rótulo legível do tipo de cota
  let quotaTypeLabel = 'Cota da Camada Gratuita (Free Tier)';
  if (quotaId?.includes('PerDay') || errorString.includes('PerDay')) {
    quotaTypeLabel = 'Limite Diário de Requisições (RPD)';
  } else if (quotaId?.includes('PerMinute') || errorString.includes('PerMinute')) {
    quotaTypeLabel = 'Limite por Minuto (RPM)';
  }

  const friendlyMessage = retrySeconds && retrySeconds > 0
    ? `Você atingiu temporariamente o limite de uso gratuito da API Gemini. Uma nova janela de requisições estará disponível em aproximadamente ${retrySeconds} segundos.`
    : 'Você atingiu o limite gratuito de requisições do Gemini para este período. O Google AI Studio renova os créditos automaticamente a cada minuto ou diariamente.';

  return {
    isQuota: true,
    title: 'Cota de IA Temporariamente Esgotada',
    message: friendlyMessage,
    retrySeconds,
    retryDelayText,
    quotaMetric,
    quotaTypeLabel,
    modelName: modelName || 'Gemini 3 Flash / Pro',
    docUrl: 'https://ai.google.dev/gemini-api/docs/rate-limits',
    raw: errorString,
  };
}
