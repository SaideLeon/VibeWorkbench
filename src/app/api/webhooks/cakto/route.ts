import { NextRequest, NextResponse } from 'next/server';
import { caktoBillingService } from '@/server/billing/cakto-service';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/cakto
 * Recebe e processa eventos de assinaturas e pagamentos da Cakto
 * Docs: https://docs.cakto.com.br/conceitos/webhooks
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verificação de segurança (Secret / Token da Cakto)
    const headerSecret = req.headers.get('x-cakto-secret');
    const headerToken = req.headers.get('x-cakto-token');
    const authHeader = req.headers.get('authorization');
    const queryToken = req.nextUrl.searchParams.get('token');

    const isAuthorized = caktoBillingService.verifyWebhookSecret(
      headerSecret,
      headerToken || authHeader,
      queryToken
    );

    if (!isAuthorized) {
      console.error('[Cakto Webhook] Erro 401: Token ou secret inválido recebido.');
      return NextResponse.json(
        { error: 'Não autorizado. Secret ou token do webhook inválido.' },
        { status: 401 }
      );
    }

    // 2. Leitura do corpo da requisição
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'Corpo da requisição vazio ou formato JSON inválido.' },
        { status: 400 }
      );
    }

    // 3. Processamento do evento pelo serviço de billing
    const result = await caktoBillingService.processWebhook(body);

    // Retorna status 200 para a Cakto acusar sucesso de entrega
    return NextResponse.json(
      {
        received: true,
        success: result.success,
        event: result.event,
        message: result.message,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Cakto Webhook] Erro interno ao processar webhook:', error);
    // Mesmo em caso de erro de execução interna não-crítica, responde para evitar retentativas agressivas
    return NextResponse.json(
      {
        received: true,
        error: error.message || 'Falha interna no processador do webhook Cakto.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/cakto
 * Endpoint de verificação de status e documentação da integração
 */
export async function GET(req: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production';
  const recentLogs = isDev ? caktoBillingService.getRecentLogs(10) : [];

  return NextResponse.json({
    status: 'online',
    provider: 'Cakto Webhooks - Mitigar IA',
    description: 'Endpoint ativo para recebimento de eventos de assinaturas recorrentes (Pix Automático, Cartão e Boleto)',
    supportedEvents: [
      'subscription_created',
      'subscription_renewed',
      'subscription_canceled',
      'subscription_overdue',
      'payment_approved',
      'charge_refunded'
    ],
    documentation: 'https://docs.cakto.com.br/conceitos/webhooks',
    security: {
      secretConfigured: !!process.env.CAKTO_WEBHOOK_SECRET,
      verificationMethods: ['Header: x-cakto-secret', 'Header: Authorization: Bearer <secret>', 'Query: ?token=<secret>']
    },
    recentLogsCount: recentLogs.length,
    recentLogs: isDev ? recentLogs : undefined
  });
}
