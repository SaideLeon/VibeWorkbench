import { NextResponse } from 'next/server';

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function serializeUnknownError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }

  return { value: error };
}

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    console.error('[API AppError]', {
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    });

    return NextResponse.json(
      { error: error.message, details: error.details, code: error.statusCode },
      { status: error.statusCode },
    );
  }

  const rawMessage = error instanceof Error ? error.message : String(error || 'Internal Server Error');
  const isQuotaError = 
    /429|RESOURCE_EXHAUSTED|Quota exceeded|rate-limits|generativelanguage\.googleapis\.com.*requests|quotaMetric|exceeded your current quota/i.test(rawMessage) ||
    (typeof error === 'object' && error !== null && ('status' in error && (error as any).status === 429));

  if (isQuotaError) {
    console.warn('[API Quota Exceeded]', { rawMessage });
    return NextResponse.json(
      {
        error: 'Limite de cota da API Gemini excedido temporariamente. Aguarde a renovação dos créditos da camada gratuita ou adicione sua própria chave de API.',
        errorType: 'QUOTA_EXCEEDED',
        code: 429,
        details: rawMessage,
      },
      { status: 429 },
    );
  }

  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const debugId = `api_${Date.now().toString(36)}`;

  console.error('[API Error]', {
    debugId,
    ...serializeUnknownError(error),
  });

  return NextResponse.json({ error: message, code: 500, debugId }, { status: 500 });
}
