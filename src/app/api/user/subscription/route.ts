import { NextRequest, NextResponse } from 'next/server';
import { caktoBillingService } from '@/server/billing/cakto-service';

export const runtime = 'nodejs';

/**
 * GET /api/user/subscription?email=usuario@exemplo.com
 * Retorna o status da assinatura do usuário, plano ativo e permissões
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({
      plan: 'free',
      planName: 'Plano Gratuito',
      status: 'none',
      isSubscribed: false,
      features: {
        maxMonthlyAudits: 3,
        canDownloadPatch: true,
        canDownloadBlueprint: true,
        hasASTDeepScan: false,
        hasGithubPRAutoCreate: false,
        hasUnlimitedAudits: false,
        hasCustomRules: false,
      }
    });
  }

  const subscription = caktoBillingService.getSubscription(email);

  if (!subscription || subscription.status !== 'active') {
    return NextResponse.json({
      plan: 'free',
      planName: 'Plano Gratuito',
      status: subscription?.status || 'none',
      isSubscribed: false,
      subscription: subscription || null,
      features: {
        maxMonthlyAudits: 3,
        canDownloadPatch: true,
        canDownloadBlueprint: true,
        hasASTDeepScan: false,
        hasGithubPRAutoCreate: false,
        hasUnlimitedAudits: false,
        hasCustomRules: false,
      }
    });
  }

  // Plano ativo
  const isPro = subscription.plan === 'pro' || subscription.plan === 'studio';
  const isStudio = subscription.plan === 'studio';

  return NextResponse.json({
    plan: subscription.plan,
    planName: subscription.planName,
    status: subscription.status,
    isSubscribed: true,
    frequency: subscription.frequency,
    paymentMethod: subscription.paymentMethod,
    currentPeriodEnd: subscription.currentPeriodEnd,
    subscription,
    features: {
      maxMonthlyAudits: isStudio ? 9999 : isPro ? 999 : 15,
      canDownloadPatch: true,
      canDownloadBlueprint: true,
      hasASTDeepScan: isPro,
      hasGithubPRAutoCreate: isPro,
      hasUnlimitedAudits: isPro,
      hasCustomRules: isStudio,
    }
  });
}
