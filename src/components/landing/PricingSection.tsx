'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Building2, 
  ArrowRight, 
  Lock, 
  HelpCircle,
  Clock,
  Terminal,
  QrCode,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CaktoWebhookSimulatorModal } from '@/components/billing/CaktoWebhookSimulatorModal';

interface PricingSectionProps {
  onSelectPlan?: (planId: string) => void;
  onStartFreeAudit?: () => void;
}

export const PricingSection = ({ onSelectPlan, onStartFreeAudit }: PricingSectionProps) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      badge: 'Criadores Solo & MVPs',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      description: 'Ideal para quem cria micro-SaaS e MVPs com IA e precisa validar a segurança antes do lançamento.',
      priceMonthly: 67,
      priceAnnual: 54, // ~R$ 648/ano
      checkoutUrlMonthly: process.env.NEXT_PUBLIC_CAKTO_STARTER_MONTHLY_URL || 'https://pay.cakto.com.br/starter-mensal',
      checkoutUrlAnnual: process.env.NEXT_PUBLIC_CAKTO_STARTER_ANNUAL_URL || 'https://pay.cakto.com.br/starter-anual',
      icon: Zap,
      accentColor: 'blue',
      features: [
        'Até 15 auditorias de repositórios/mês',
        'Auditoria contra 36 regras críticas e 7 brechas',
        'Geração de Blueprints de Segurança em Markdown',
        'Download de arquivos .patch prontos para o Git',
        'Detecção de chaves de API expostas no front-end',
        'Verificação básica de regras RLS no Supabase',
        'Suporte por e-mail e comunidade'
      ],
      ctaText: 'Começar com Starter',
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro Developer',
      badge: 'Mais Escolhido 🔥',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      description: 'Para engenheiros de software, freelancers e criadores ativos que exigem blindagem contínua e automação GitHub.',
      priceMonthly: 147,
      priceAnnual: 118, // ~R$ 1.416/ano
      checkoutUrlMonthly: process.env.NEXT_PUBLIC_CAKTO_PRO_MONTHLY_URL || 'https://pay.cakto.com.br/pro-mensal',
      checkoutUrlAnnual: process.env.NEXT_PUBLIC_CAKTO_PRO_ANNUAL_URL || 'https://pay.cakto.com.br/pro-anual',
      icon: ShieldCheck,
      accentColor: 'indigo',
      features: [
        'Auditorias Ilimitadas em até 10 repositórios',
        'Abertura Automática de Pull Requests no GitHub',
        'Histórico de Commits & Rollback Seguro em 1 clique',
        'Scanner AST Profundo de Segredos e Chaves Privadas',
        'Auditoria Avançada de Políticas RLS & Multi-tenant',
        'Chat Inteligente com IA alimentado por Google Gemini',
        'Suporte Prioritário por E-mail & Discord'
      ],
      ctaText: 'Garantir Plano Pro',
      popular: true,
    },
    {
      id: 'studio',
      name: 'Studio & Agências',
      badge: 'Para Equipes & Software Houses',
      badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      description: 'Para agências, software houses e equipes corporativas que auditam múltiplos clientes e emitem laudos.',
      priceMonthly: 347,
      priceAnnual: 278, // ~R$ 3.336/ano
      checkoutUrlMonthly: process.env.NEXT_PUBLIC_CAKTO_STUDIO_MONTHLY_URL || 'https://pay.cakto.com.br/studio-mensal',
      checkoutUrlAnnual: process.env.NEXT_PUBLIC_CAKTO_STUDIO_ANNUAL_URL || 'https://pay.cakto.com.br/studio-anual',
      icon: Building2,
      accentColor: 'amber',
      features: [
        'Repositórios e Auditorias Ilimitadas',
        'Múltiplos desenvolvedores e chaves de API de equipe',
        'Geração e Exportação de Laudo Técnico / Relatório PDF',
        'Motor Cirúrgico com Garantia de Preservação de Código',
        'Auditoria de pipelines CI/CD e governança',
        'Catálogo de regras corporativas personalizadas',
        'Suporte VIP Dedicado via WhatsApp'
      ],
      ctaText: 'Contratar Plano Studio',
      popular: false,
    }
  ];

  const handlePlanClick = (plan: typeof plans[0]) => {
    const targetUrl = billingCycle === 'monthly' ? plan.checkoutUrlMonthly : plan.checkoutUrlAnnual;
    if (targetUrl && targetUrl.startsWith('http')) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (onSelectPlan) {
      onSelectPlan(plan.id);
    } else if (onStartFreeAudit) {
      onStartFreeAudit();
    }
  };

  return (
    <section id="planos" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#09090c] relative overflow-hidden border-t border-white/5">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Escolha o nível de proteção do <span className="text-indigo-400">Mitigar IA</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Proteja seu negócio, sua reputação e seus clientes contra as 7 brechas críticas do VibeCoding com planos acessíveis e retorno imediato.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="pt-6 flex flex-col items-center justify-center gap-4">
            <div className="bg-[#121217] border border-white/10 p-1 rounded-xl inline-flex items-center gap-1 shadow-inner">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  billingCycle === 'monthly'
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-gray-400 hover:text-white"
                )}
              >
                Cobrança Mensal
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                  billingCycle === 'annual'
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <span>Cobrança Anual</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  2 Meses Grátis (-20%)
                </span>
              </button>
            </div>

            {/* Recorrência sem atrito Cakto */}
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-medium">
                <QrCode className="w-3 h-3" />
                <span>Pix Automático Recorrente</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-[11px] font-medium">
                <CreditCard className="w-3 h-3" />
                <span>Cartão de Crédito Automático</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceAnnual;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "relative rounded-2xl flex flex-col justify-between p-6 sm:p-8 transition-all duration-300",
                  plan.popular
                    ? "bg-[#13131a] border-2 border-indigo-500/60 shadow-2xl shadow-indigo-500/15 lg:-translate-y-2"
                    : "bg-[#111116] border border-white/10 hover:border-white/20 shadow-xl"
                )}
              >
                {/* Popular Pill */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg border border-indigo-400/40 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Mais Recomendado
                  </div>
                )}

                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-6 min-h-[36px]">
                    {plan.description}
                  </p>

                  {/* Pricing Display */}
                  <div className="pb-6 mb-6 border-b border-white/10">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-gray-400 font-semibold">R$</span>
                      <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                        {price}
                      </span>
                      <span className="text-xs text-gray-400">/ mês</span>
                    </div>
                    {billingCycle === 'annual' && (
                      <p className="text-[11px] text-emerald-400 mt-1">
                        Cobrado anualmente (R$ {price * 12}/ano)
                      </p>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-8">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      O que está incluído:
                    </div>
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-gray-300">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                        <span className="leading-snug">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div>
                  <button
                    onClick={() => handlePlanClick(plan)}
                    className={cn(
                      "w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg",
                      plan.popular
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
                        : "bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/20"
                    )}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-[10px] text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    Pagamento 100% seguro via Cakto • Pix Automático & Cartão
                  </p>
                </div>

              </motion.div>
            );
          })}
        </div>

        {/* Cakto Webhook Integration Bar */}
        <div className="mt-12 p-4 rounded-xl bg-gradient-to-r from-indigo-950/30 via-[#121218] to-indigo-950/30 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Integração SaaS Headless via Webhook Cakto</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-mono">/api/webhooks/cakto</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Liberação e cancelamento de planos processados automaticamente via eventos de assinatura.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Simular Webhook Cakto (Sandbox)</span>
          </button>
        </div>

        {/* Guarantees and Trust Footer */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-white/5">
          <div className="flex items-center gap-3.5 bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Garantia Incondicional de 7 Dias</div>
              <div className="text-[11px] text-gray-400">Se não aprovar a auditoria, devolvemos 100% do seu valor.</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Ativação Instantânea</div>
              <div className="text-[11px] text-gray-400">Acesso liberado imediatamente após a confirmação.</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Suporte Técnico Especializado</div>
              <div className="text-[11px] text-gray-400">Dúvidas sobre regras e patches resolvidas por especialistas.</div>
            </div>
          </div>
        </div>

        {/* Modal de Simulação Cakto Sandbox */}
        <CaktoWebhookSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
        />

      </div>
    </section>
  );
};
