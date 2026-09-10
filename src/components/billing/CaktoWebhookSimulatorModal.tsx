'use client';

import { useState } from 'react';
import { 
  X, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  CreditCard,
  QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaktoWebhookSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionUpdated?: (email: string) => void;
}

export const CaktoWebhookSimulatorModal = ({
  isOpen,
  onClose,
  onSubscriptionUpdated
}: CaktoWebhookSimulatorModalProps) => {
  const [activeTab, setActiveTab] = useState<'form' | 'json'>('json');
  const [email, setEmail] = useState('desenvolvedor@empresa.com.br');
  const [event, setEvent] = useState('subscription_created');
  const [plan, setPlan] = useState<'starter' | 'pro' | 'studio'>('pro');
  const [paymentMethod, setPaymentMethod] = useState<'pix_automatico' | 'credit_card' | 'boleto'>('pix_automatico');
  
  const defaultCaktoPayload = JSON.stringify({
  "secret": "f8c3de3d-1fea-4d7c-a8b0-29f63c4c3454",
  "event": "purchase_approved",
  "data": {
    "id": "87956abe-940e-4e8b-8a27-82c482920f64",
    "refId": "9vbgfmg",
    "customer": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "34999999999",
      "docNumber": "12345678909",
      "birthDate": null,
      "docType": "cpf"
    },
    "address": null,
    "shipping": null,
    "affiliate": "affiliate@example.com",
    "offer": {
      "id": "B8BcHrY",
      "name": "Special Offer",
      "price": 100,
      "image": null
    },
    "offer_type": "main",
    "product": {
      "name": "Produto Teste",
      "id": "ff3fdf61-e88f-43b5-982a-32d50f112414",
      "short_id": "AckhQ75",
      "supportEmail": "suporte@seudominio.com",
      "type": "unique",
      "invoiceDescription": ""
    },
    "checkout": 12345,
    "subscription": null,
    "subscription_period": 1,
    "parent_order": null,
    "checkoutUrl": "https://pay.cakto.com.br/EXAMPLE",
    "status": "paid",
    "baseAmount": 100,
    "discount": 10,
    "amount": 90,
    "commissions": [
      {
        "user": "produtor@seudominio.com",
        "totalAmount": 85.5,
        "type": "producer",
        "percentage": 95
      }
    ],
    "fees": 4.5,
    "couponCode": null,
    "reason": null,
    "refund_reason": null,
    "installments": 1,
    "paymentMethod": "credit_card",
    "paymentMethodName": "Cartão de Crédito",
    "paidAt": "2026-06-26T12:00:00.000000+00:00",
    "createdAt": "2026-06-26T12:00:00.000000+00:00",
    "card": {
      "lastDigits": "4323",
      "holderName": "Card Example",
      "brand": "visa"
    }
  }
}, null, 2);

  const [rawJson, setRawJson] = useState(defaultCaktoPayload);
  const [isLoading, setIsLoading] = useState(false);
  const [responseLog, setResponseLog] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setResponseLog(null);

    try {
      let bodyPayload: any;

      if (activeTab === 'json') {
        let parsed: any;
        try {
          parsed = JSON.parse(rawJson);
        } catch (e: any) {
          throw new Error('O JSON informado possui erros de sintaxe: ' + e.message);
        }
        bodyPayload = { rawPayload: parsed };
      } else {
        bodyPayload = {
          event,
          email,
          plan,
          paymentMethod
        };
      }

      const res = await fetch('/api/webhooks/cakto/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao processar simulação do webhook');
      }

      setResponseLog(data);
      if (onSubscriptionUpdated) {
        const updatedEmail = data.customerEmail || email;
        onSubscriptionUpdated(updatedEmail);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao simular');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Simulador de Webhooks da Cakto</h3>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Sandbox & Teste
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Dispare eventos em tempo real para testar a liberação e cancelamento de acessos no SaaS.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">

          {/* Abas de Modo */}
          <div className="flex border-b border-white/10 gap-4 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={cn(
                "text-xs font-semibold pb-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === 'json'
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              )}
            >
              <Terminal className="w-3.5 h-3.5" />
              Payload JSON da Cakto (purchase_approved, etc.)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={cn(
                "text-xs font-semibold pb-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === 'form'
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              )}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Formulário Rápido
            </button>
          </div>

          {activeTab === 'json' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300">
                  Cole ou edite o JSON enviado pelo Webhook da Cakto:
                </label>
                <button
                  type="button"
                  onClick={() => setRawJson(defaultCaktoPayload)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer underline"
                >
                  Restaurar payload purchase_approved
                </button>
              </div>
              <textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                rows={12}
                className="w-full bg-[#181820] border border-white/10 rounded-xl p-3 text-[11px] font-mono text-emerald-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                placeholder="Cole aqui o payload JSON da Cakto..."
              />
              <p className="text-[11px] text-gray-400">
                Este simulador testa diretamente a normalização de dados, ativação de plano, secret de segurança e sincronização no Supabase.
              </p>
            </div>
          ) : (
            <>
              {/* E-mail do Cliente */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  E-mail do Assinante (Cliente Cakto):
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  placeholder="cliente@exemplo.com.br"
                />
              </div>

              {/* Evento */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Tipo de Evento da Cakto:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'purchase_approved', label: 'purchase_approved', desc: 'Compra Aprovada (Cakto)' },
                    { id: 'subscription_created', label: 'subscription_created', desc: 'Nova Assinatura Ativada' },
                    { id: 'subscription_canceled', label: 'subscription_canceled', desc: 'Assinatura Cancelada' }
                  ].map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setEvent(ev.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer",
                        event === ev.id
                          ? "bg-indigo-600/15 border-indigo-500/50 text-indigo-200"
                          : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-gray-200"
                      )}
                    >
                      <div className="text-xs font-mono font-bold">{ev.label}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{ev.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plano & Método */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Plano Ofertado:
                  </label>
                  <select
                    value={plan}
                    onChange={(e: any) => setPlan(e.target.value)}
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="starter">Starter (R$ 67/mês)</option>
                    <option value="pro">Pro Developer (R$ 147/mês)</option>
                    <option value="studio">Studio & Agências (R$ 347/mês)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Forma de Pagamento:
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="pix_automatico">⚡ Pix Automático (Recorrente)</option>
                    <option value="credit_card">💳 Cartão de Crédito</option>
                    <option value="boleto">📄 Boleto Bancário</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Resultado do Teste */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {responseLog && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Evento Cakto processado com sucesso!</span>
              </div>
              <div className="text-xs text-gray-300">
                {responseLog.result?.message}
              </div>
              <pre className="text-[11px] font-mono bg-black/50 p-3 rounded-lg text-emerald-300 overflow-x-auto border border-emerald-500/20">
                {JSON.stringify(responseLog.result?.subscription || responseLog.result, null, 2)}
              </pre>
            </div>
          )}

          {/* Docs Tip */}
          <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-gray-300">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-white">Endpoint Oficial do Webhook: </span>
              <code className="text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded font-mono text-[11px]">
                /api/webhooks/cakto
              </code>
              <p className="text-[11px] text-gray-400 mt-1">
                Configure esta URL no painel da Cakto em <strong>Ferramentas &gt; Webhooks</strong> e insira o seu token em <code className="text-gray-300">CAKTO_WEBHOOK_SECRET</code>.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            onClick={handleSimulate}
            disabled={isLoading || !email}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Disparar Webhook Teste</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
