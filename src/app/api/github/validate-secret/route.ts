import { NextRequest, NextResponse } from 'next/server';
import { AppError, jsonError } from '@/app/api/_utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secret, provider } = body;

    if (!secret || typeof secret !== 'string') {
      throw new AppError('Secret é obrigatório para validação.', 400);
    }

    const cleanSecret = secret.trim();
    let isValid = false;
    let statusText = 'Não foi possível validar';
    let httpStatus: number | undefined;

    const lowerProvider = (provider || '').toLowerCase();

    // 1. Stripe
    if (lowerProvider.includes('stripe') || cleanSecret.startsWith('sk_') || cleanSecret.startsWith('rk_')) {
      try {
        const res = await fetch('https://api.stripe.com/v1/account', {
          headers: { Authorization: `Bearer ${cleanSecret}` },
        });
        httpStatus = res.status;
        isValid = res.status === 200;
        statusText = isValid ? 'Credencial Stripe ATIVA e funcional!' : `Inválida / Revogada (HTTP ${res.status})`;
      } catch (e: any) {
        statusText = `Erro de conexão: ${e.message}`;
      }
    }
    // 2. Google AI / Google Cloud
    else if (lowerProvider.includes('google') || cleanSecret.startsWith('AIza') || cleanSecret.startsWith('AQ.')) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanSecret)}`);
        httpStatus = res.status;
        isValid = res.status === 200;
        statusText = isValid ? 'Chave Google AI ATIVA e funcional!' : `Inválida / Revogada (HTTP ${res.status})`;
      } catch (e: any) {
        statusText = `Erro de conexão: ${e.message}`;
      }
    }
    // 3. Slack
    else if (lowerProvider.includes('slack') || cleanSecret.startsWith('xox')) {
      try {
        const res = await fetch('https://slack.com/api/auth.test', {
          headers: { Authorization: `Bearer ${cleanSecret}` },
        });
        const data = await res.json();
        isValid = data.ok === true;
        statusText = isValid ? 'Token Slack ATIVO e com permissões!' : `Inválido / Revogado (${data.error || 'auth_failed'})`;
      } catch (e: any) {
        statusText = `Erro de conexão: ${e.message}`;
      }
    }
    // 4. SendGrid
    else if (lowerProvider.includes('sendgrid') || cleanSecret.startsWith('SG.')) {
      try {
        const res = await fetch('https://api.sendgrid.com/v3/user/profile', {
          headers: { Authorization: `Bearer ${cleanSecret}` },
        });
        httpStatus = res.status;
        isValid = res.status === 200;
        statusText = isValid ? 'Chave SendGrid ATIVA!' : `Inválida / Revogada (HTTP ${res.status})`;
      } catch (e: any) {
        statusText = `Erro de conexão: ${e.message}`;
      }
    }
    // 5. GitHub Personal Access Token
    else if (lowerProvider.includes('github') || cleanSecret.startsWith('ghp_') || cleanSecret.startsWith('github_pat_')) {
      try {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `token ${cleanSecret}`,
            'User-Agent': 'Security-Audit-Applet',
          },
        });
        httpStatus = res.status;
        isValid = res.status === 200;
        statusText = isValid ? 'Token GitHub ATIVO e autenticado!' : `Inválido / Revogado (HTTP ${res.status})`;
      } catch (e: any) {
        statusText = `Erro de conexão: ${e.message}`;
      }
    }
    // 6. Telegram Bot
    else if (lowerProvider.includes('telegram') || /^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/.test(cleanSecret)) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(cleanSecret)}/getMe`);
        const data = await res.json();
        isValid = data.ok === true;
        statusText = isValid ? 'Token Telegram Bot ATIVO!' : 'Inválido / Revogado';
      } catch (e: any) {
        statusText = `Erro de conexão: ${e.message}`;
      }
    }
    // 7. Twilio
    else if (lowerProvider.includes('twilio') || cleanSecret.startsWith('SK') || cleanSecret.startsWith('AC')) {
      try {
        const authHeader = Buffer.from(`${cleanSecret}:`).toString('base64');
        const res = await fetch('https://api.twilio.com/2010-04-01/Accounts.json', {
          headers: { Authorization: `Basic ${authHeader}` },
        });
        httpStatus = res.status;
        isValid = res.status === 200;
        statusText = isValid ? 'Credencial Twilio ATIVA!' : `Inválida / Revogada (HTTP ${res.status})`;
      } catch (e: any) {
        statusText = `Erro de conexão: ${e.message}`;
      }
    }
    // 8. Facebook
    else if (lowerProvider.includes('facebook') || cleanSecret.startsWith('EAAC')) {
      try {
        const res = await fetch(`https://graph.facebook.com/me?access_token=${encodeURIComponent(cleanSecret)}`);
        httpStatus = res.status;
        isValid = res.status === 200;
        statusText = isValid ? 'Token Facebook Graph ATIVO!' : `Inválido / Revogado (HTTP ${res.status})`;
      } catch (e: any) {
        statusText = `Erro de conexão: ${e.message}`;
      }
    }
    // Provedor genérico ou não testável diretamente via endpoint público
    else {
      statusText = 'Provedor requer verificação manual no console correspondente';
    }

    return NextResponse.json({
      success: true,
      valid: isValid,
      provider: provider || 'Generic',
      statusText,
      httpStatus,
      testedAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
