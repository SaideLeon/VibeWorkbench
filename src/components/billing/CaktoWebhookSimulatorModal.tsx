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
  const [email, setEmail] = useState('desenvolvedor@empresa.com.br');
  const [event, setEvent] = useState('subscription_created');
  const [plan, setPlan] = useState<'starter' | 'pro' | 'studio'>('pro');
  const [paymentMethod, setPaymentMethod] = useState<'pix_automatico' | 'credit_card' | 'boleto'>('pix_automatico');
  const [isLoading, setIsLoading] = useState(false);
  const [responseLog, setResponseLog] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setResponseLog(null);

    try {
      const res = await fetch('/api/webhooks/cakto/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          email,
          plan,
          paymentMethod
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao processar simulação do webhook');
      }

      setResponseLog(data);
      if (onSubscriptionUpdated) {
        onSubscriptionUpdated(email);
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
                { id: 'subscription_created', label: 'subscription_created', desc: 'Nova Assinatura Ativada' },
                { id: 'subscription_renewed', label: 'subscription_renewed', desc: 'Cobrança Recorrente Paga' },
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
