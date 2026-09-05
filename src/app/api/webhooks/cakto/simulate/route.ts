import { NextRequest, NextResponse } from 'next/server';
import { caktoBillingService, PlanType } from '@/server/billing/cakto-service';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/cakto/simulate
 * Rota para simulação e teste de eventos do Webhook da Cakto em ambiente de desenvolvimento
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      event = 'subscription_created',
      email = 'desenvolvedor@empresa.com.br',
      plan = 'pro',
      paymentMethod = 'pix_automatico'
    } = body;

    const result = await caktoBillingService.simulateWebhookEvent(
      event,
      email,
      plan as PlanType,
      paymentMethod
    );

    return NextResponse.json({
      success: true,
      simulatedEvent: event,
      customerEmail: email,
      result
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao simular evento Cakto.' },
      { status: 500 }
    );
  }
}
