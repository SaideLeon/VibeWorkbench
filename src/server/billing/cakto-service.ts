import fs from 'fs';
import path from 'path';

export type PlanType = 'starter' | 'pro' | 'studio' | 'free';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
export type BillingFrequency = 'monthly' | 'annual' | 'quarterly' | 'weekly';

export interface UserSubscription {
  id: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  plan: PlanType;
  planName: string;
  status: SubscriptionStatus;
  frequency: BillingFrequency;
  paymentMethod: 'pix_automatico' | 'credit_card' | 'boleto' | 'pix' | 'unknown';
  amountCents: number;
  currency: string;
  caktoSubscriptionId: string;
  caktoProductId?: string;
  caktoOfferId?: string;
  createdAt: string;
  updatedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  metadata?: Record<string, any>;
}

export interface WebhookLog {
  id: string;
  event: string;
  receivedAt: string;
  customerEmail?: string;
  subscriptionId?: string;
  status: 'processed' | 'ignored' | 'failed';
  message: string;
}

// Persistência local segura para o ambiente de execução
const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'subscriptions.json');
const LOGS_FILE = path.join(DATA_DIR, 'webhook_logs.json');

class CaktoBillingService {
  private subscriptions: Map<string, UserSubscription> = new Map();
  private processedEventIds: Set<string> = new Set();
  private webhookLogs: WebhookLog[] = [];
  private isLoaded: boolean = false;

  constructor() {
    this.loadFromDisk();
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {
      // Ignora se não for possível criar no ambiente
    }
  }

  private loadFromDisk() {
    if (this.isLoaded) return;
    try {
      this.ensureDataDir();
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const list: UserSubscription[] = JSON.parse(raw);
        list.forEach((sub) => {
          this.subscriptions.set(sub.customerEmail.toLowerCase().trim(), sub);
        });
      }

      if (fs.existsSync(LOGS_FILE)) {
        const rawLogs = fs.readFileSync(LOGS_FILE, 'utf-8');
        this.webhookLogs = JSON.parse(rawLogs);
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn('[CaktoBillingService] Aviso: Usando persistência em memória temporária:', err);
      this.isLoaded = true;
    }
  }

  private saveToDisk() {
    try {
      this.ensureDataDir();
      const list = Array.from(this.subscriptions.values());
      fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2), 'utf-8');
      fs.writeFileSync(LOGS_FILE, JSON.stringify(this.webhookLogs.slice(0, 100), null, 2), 'utf-8');
    } catch (err) {
      console.warn('[CaktoBillingService] Aviso ao salvar em disco:', err);
    }
  }

  /**
   * Valida se a requisição do webhook é autêntica via secret ou token
   */
  public verifyWebhookSecret(
    headerSecret?: string | null,
    headerToken?: string | null,
    queryToken?: string | null
  ): boolean {
    const configuredSecret = process.env.CAKTO_WEBHOOK_SECRET;

    // Se não configurado em ambiente de desenvolvimento, permite a execução com aviso
    if (!configuredSecret) {
      console.warn('[Cakto] CAKTO_WEBHOOK_SECRET não definido em .env. Permitindo em modo flexível.');
      return true;
    }

    const candidate = headerSecret || headerToken || queryToken;
    if (!candidate) return false;

    // Remove 'Bearer ' se vier no cabeçalho Authorization
    const cleanCandidate = candidate.replace(/^Bearer\s+/i, '').trim();
    return cleanCandidate === configuredSecret.trim();
  }

  /**
   * Mapeia nome ou ID de produto/oferta da Cakto para o plano do Mitigar IA
   */
  public resolvePlan(productName?: string, offerName?: string, rawPlan?: string): { plan: PlanType; planName: string } {
    const text = `${productName || ''} ${offerName || ''} ${rawPlan || ''}`.toLowerCase();

    if (text.includes('studio') || text.includes('agencia') || text.includes('agência') || text.includes('enterprise')) {
      return { plan: 'studio', planName: 'Studio & Agências' };
    }

    if (text.includes('pro') || text.includes('developer') || text.includes('avançado') || text.includes('profissional')) {
      return { plan: 'pro', planName: 'Pro Developer' };
    }

    if (text.includes('starter') || text.includes('iniciante') || text.includes('mvp') || text.includes('solo')) {
      return { plan: 'starter', planName: 'Starter' };
    }

    // Default se não identificado
    return { plan: 'pro', planName: 'Pro Developer' };
  }

  /**
   * Normaliza forma de pagamento da Cakto
   */
  public normalizePaymentMethod(method?: string): 'pix_automatico' | 'credit_card' | 'boleto' | 'pix' | 'unknown' {
    if (!method) return 'unknown';
    const m = method.toLowerCase();
    if (m.includes('pix_auto') || m.includes('pix automatico') || m.includes('pix_automatico') || m.includes('recorrente_pix')) {
      return 'pix_automatico';
    }
    if (m.includes('pix')) return 'pix';
    if (m.includes('card') || m.includes('cartao') || m.includes('cartão') || m.includes('credit')) {
      return 'credit_card';
    }
    if (m.includes('boleto') || m.includes('billet')) return 'boleto';
    return 'unknown';
  }

  /**
   * Processa o payload bruto enviado pelo Webhook da Cakto
   */
  public async processWebhook(payload: any): Promise<{
    success: boolean;
    event: string;
    subscription?: UserSubscription;
    message: string;
  }> {
    this.loadFromDisk();

    // Normaliza os dados do webhook (Cakto pode enviar com wrapper { event, data } ou plano)
    const event = (payload.event || payload.type || payload.event_type || 'unknown').toLowerCase();
    const data = payload.data || payload;

    // Idempotência: Se houver transactionId ou eventId já processado, ignora duplicação
    const eventId = payload.id || payload.event_id || data?.id || data?.transaction_id || `${event}_${Date.now()}`;
    if (this.processedEventIds.has(eventId)) {
      return {
        success: true,
        event,
        message: 'Evento já processado anteriormente (idempotência atendida).'
      };
    }
    this.processedEventIds.add(eventId);

    // Extrai informações do cliente
    const customer = data.customer || data.buyer || data.client || {};
    const customerEmail = (
      customer.email ||
      data.customer_email ||
      data.email ||
      payload.customer_email ||
      ''
    ).toLowerCase().trim();

    if (!customerEmail) {
      const logEntry: WebhookLog = {
        id: eventId,
        event,
        receivedAt: new Date().toISOString(),
        status: 'ignored',
        message: 'Webhook recebido sem e-mail de cliente identificado.'
      };
      this.webhookLogs.unshift(logEntry);
      this.saveToDisk();
      return { success: false, event, message: 'E-mail do cliente não encontrado no payload.' };
    }

    const customerName = customer.name || data.customer_name || customer.full_name || '';
    const customerPhone = customer.phone || customer.cellphone || '';

    // Extrai produto, plano e assinatura
    const product = data.product || {};
    const offer = data.offer || {};
    const { plan, planName } = this.resolvePlan(product.name, offer.name, data.plan_name || data.plan);
    const caktoSubscriptionId = String(data.subscription_id || data.subscription?.id || data.id || `cakto_${Date.now()}`);
    const caktoProductId = String(product.id || data.product_id || '');
    const caktoOfferId = String(offer.id || data.offer_id || '');
    const paymentMethod = this.normalizePaymentMethod(data.payment_method || data.paymentMethod || data.method);
    const amountCents = Number(data.amount || data.price || data.value || 0);

    const now = new Date();
    const existing = this.subscriptions.get(customerEmail);

    let updatedSubscription: UserSubscription = existing || {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      customerEmail,
      customerName,
      customerPhone,
      plan: 'free',
      planName: 'Plano Gratuito',
      status: 'canceled',
      frequency: 'monthly',
      paymentMethod,
      amountCents,
      currency: 'BRL',
      caktoSubscriptionId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: now.toISOString(),
      cancelAtPeriodEnd: false
    };

    switch (event) {
      // 1. Assinatura criada ou primeiro pagamento aprovado
      case 'subscription_created':
      case 'payment_approved':
      case 'purchase_approved':
      case 'charge_approved':
      case 'order_paid': {
        const periodStart = data.current_period_start || now.toISOString();
        const periodEnd = data.current_period_end || new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000).toISOString();

        updatedSubscription = {
          id: existing?.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          customerEmail,
          customerName: customerName || existing?.customerName,
          customerPhone: customerPhone || existing?.customerPhone,
          plan,
          planName,
          status: 'active',
          frequency: (data.frequency || data.billing_frequency || 'monthly') as BillingFrequency,
          paymentMethod,
          amountCents,
          currency: 'BRL',
          caktoSubscriptionId,
          caktoProductId,
          caktoOfferId,
          createdAt: existing?.createdAt || now.toISOString(),
          updatedAt: now.toISOString(),
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          metadata: data.metadata || existing?.metadata || {}
        };

        this.subscriptions.set(customerEmail, updatedSubscription);
        break;
      }

      // 2. Assinatura renovada (ciclo subsequente via Pix Automático ou Cartão)
      case 'subscription_renewed':
      case 'subscription_charged':
      case 'invoice_paid': {
        const periodStart = data.current_period_start || now.toISOString();
        const periodEnd = data.current_period_end || new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000).toISOString();

        updatedSubscription = {
          ...(existing || {
            id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            customerEmail,
            createdAt: now.toISOString(),
            cancelAtPeriodEnd: false
          }),
          customerName: customerName || existing?.customerName,
          plan: existing?.plan || plan,
          planName: existing?.planName || planName,
          status: 'active',
          frequency: existing?.frequency || 'monthly',
          paymentMethod: paymentMethod !== 'unknown' ? paymentMethod : (existing?.paymentMethod || 'pix_automatico'),
          amountCents: amountCents || existing?.amountCents || 0,
          currency: 'BRL',
          caktoSubscriptionId,
          updatedAt: now.toISOString(),
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd
        };

        this.subscriptions.set(customerEmail, updatedSubscription);
        break;
      }

      // 3. Assinatura cancelada
      case 'subscription_canceled':
      case 'subscription_cancelled': {
        if (existing) {
          updatedSubscription = {
            ...existing,
            status: 'canceled',
            cancelAtPeriodEnd: true,
            canceledAt: now.toISOString(),
            updatedAt: now.toISOString()
          };
          this.subscriptions.set(customerEmail, updatedSubscription);
        } else {
          updatedSubscription = {
            id: `sub_${Date.now()}`,
            customerEmail,
            customerName,
            plan: 'free',
            planName: 'Gratuito',
            status: 'canceled',
            frequency: 'monthly',
            paymentMethod: 'unknown',
            amountCents: 0,
            currency: 'BRL',
            caktoSubscriptionId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: now.toISOString(),
            cancelAtPeriodEnd: true,
            canceledAt: now.toISOString()
          };
          this.subscriptions.set(customerEmail, updatedSubscription);
        }
        break;
      }

      // 4. Inadimplência / Atraso no pagamento
      case 'subscription_overdue':
      case 'subscription_past_due':
      case 'payment_failed': {
        if (existing) {
          updatedSubscription = {
            ...existing,
            status: 'past_due',
            updatedAt: now.toISOString()
          };
          this.subscriptions.set(customerEmail, updatedSubscription);
        } else {
          updatedSubscription = {
            id: `sub_${Date.now()}`,
            customerEmail,
            customerName,
            plan: 'free',
            planName: 'Gratuito',
            status: 'past_due',
            frequency: 'monthly',
            paymentMethod: 'unknown',
            amountCents: 0,
            currency: 'BRL',
            caktoSubscriptionId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: now.toISOString(),
            cancelAtPeriodEnd: false
          };
          this.subscriptions.set(customerEmail, updatedSubscription);
        }
        break;
      }

      // 5. Reembolso ou Chargeback
      case 'charge_refunded':
      case 'refund':
      case 'chargeback': {
        if (existing) {
          updatedSubscription = {
            ...existing,
            status: 'canceled',
            plan: 'free',
            planName: 'Plano Gratuito (Reembolsado)',
            canceledAt: now.toISOString(),
            updatedAt: now.toISOString()
          };
          this.subscriptions.set(customerEmail, updatedSubscription);
        }
        break;
      }

      default: {
        const logEntry: WebhookLog = {
          id: eventId,
          event,
          customerEmail,
          subscriptionId: caktoSubscriptionId,
          receivedAt: now.toISOString(),
          status: 'ignored',
          message: `Evento '${event}' recebido sem alteração de status necessária.`
        };
        this.webhookLogs.unshift(logEntry);
        this.saveToDisk();
        return {
          success: true,
          event,
          message: `Evento '${event}' registrado sem modificação de plano.`
        };
      }
    }

    const logEntry: WebhookLog = {
      id: eventId,
      event,
      customerEmail,
      subscriptionId: caktoSubscriptionId,
      receivedAt: now.toISOString(),
      status: 'processed',
      message: `Assinatura de ${customerEmail} atualizada para ${updatedSubscription.plan.toUpperCase()} (${updatedSubscription.status}).`
    };
    this.webhookLogs.unshift(logEntry);
    this.saveToDisk();

    return {
      success: true,
      event,
      subscription: updatedSubscription,
      message: `Plano atualizado para ${updatedSubscription.planName} (${updatedSubscription.status}).`
    };
  }

  /**
   * Consulta a assinatura ativa de um usuário pelo e-mail
   */
  public getSubscription(email?: string | null): UserSubscription | null {
    if (!email) return null;
    this.loadFromDisk();
    return this.subscriptions.get(email.toLowerCase().trim()) || null;
  }

  /**
   * Retorna os últimos logs de webhooks recebidos da Cakto para visualização e depuração
   */
  public getRecentLogs(limit: number = 20): WebhookLog[] {
    this.loadFromDisk();
    return this.webhookLogs.slice(0, limit);
  }

  /**
   * Lista todas as assinaturas registradas (para painel interno)
   */
  public listSubscriptions(): UserSubscription[] {
    this.loadFromDisk();
    return Array.from(this.subscriptions.values());
  }

  /**
   * Helper para simular/testar um evento de webhook da Cakto no ambiente de desenvolvimento
   */
  public async simulateWebhookEvent(event: string, email: string, plan: PlanType, paymentMethod: string = 'pix_automatico') {
    const mockPayload = {
      id: `sim_${Date.now()}`,
      event,
      data: {
        id: `cakto_sub_${Math.random().toString(36).substring(2, 8)}`,
        status: event === 'subscription_canceled' ? 'canceled' : 'active',
        customer: {
          name: 'Usuário Teste Cakto',
          email,
          phone: '(11) 99999-9999'
        },
        product: {
          id: `prod_${plan}`,
          name: `Mitigar IA - ${plan.toUpperCase()}`
        },
        offer: {
          id: `off_${plan}_monthly`,
          name: `Plano ${plan.toUpperCase()} Recorrente`
        },
        payment_method: paymentMethod,
        amount: plan === 'pro' ? 14700 : plan === 'studio' ? 34700 : 6700,
        frequency: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    };

    return await this.processWebhook(mockPayload);
  }
}

// Singleton exportado para toda a aplicação server-side
export const caktoBillingService = new CaktoBillingService();
