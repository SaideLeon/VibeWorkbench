import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Lock, 
  Unlock, 
  Key, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Layers, 
  Code2, 
  Search, 
  Eye, 
  Zap,
  CheckCircle2,
  XCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HighlightCode } from '@/components/ui/HighlightCode';

export const InteractiveInspectorDemo = () => {
  const [activeTab, setActiveTab] = useState<'paywall' | 'secrets' | 'supabase'>('paywall');
  
  // Paywall Simulator State
  const [isClientMode, setIsClientMode] = useState<boolean>(true); // true = Vulnerable client-side, false = Mitigar IA Protected
  const [clientPlan, setClientPlan] = useState<'free' | 'premium'>('free');
  
  // Secrets Simulator State
  const [searchFilter, setSearchFilter] = useState<string>('key');
  const [isProtectedSecrets, setIsProtectedSecrets] = useState<boolean>(false);

  return (
    <section className="py-20 bg-[#0d0d10] border-b border-white/10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Experimente o Teste do <span className="text-amber-400 font-mono">F12</span> ao Vivo
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Veja como um invasor ou visitante curioso quebra uma aplicação de VibeCoding sem proteção em 3 segundos abrindo as ferramentas de desenvolvedor do navegador.
          </p>
        </div>

        {/* Simulator Container */}
        <div className="bg-[#121216] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-w-5xl mx-auto">
          
          {/* Top Bar of the Simulator */}
          <div className="bg-[#17171d] border-b border-white/10 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 mr-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="text-xs font-mono text-gray-400 hidden sm:inline">
                devtools://inspector/vibe-sandbox
              </span>
            </div>

            {/* Sub-demo Tabs */}
            <div className="flex items-center bg-[#0e0e12] p-1 rounded-lg border border-white/10 gap-1">
              <button
                onClick={() => setActiveTab('paywall')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer",
                  activeTab === 'paywall' ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                )}
              >
                1. Bypass de Paywall (F12)
              </button>
              <button
                onClick={() => setActiveTab('secrets')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer",
                  activeTab === 'secrets' ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                )}
              >
                2. Chaves de API Expostas (Sources)
              </button>
            </div>
          </div>

          {/* DEMO 1: Paywall & LocalStorage Bypass */}
          {activeTab === 'paywall' && (
            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Side: Mock App Interface */}
              <div className="lg:col-span-6 bg-[#0a0a0c] border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      App de Exemplo (SaaS de Impressão 3D)
                    </span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                      clientPlan === 'premium' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-gray-800 text-gray-400"
                    )}>
                      Plano Atual: {clientPlan.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Este SaaS fictício cobra US$ 49/mês para liberar a &ldquo;Estratégia Completa de Gestão de Filamentos&rdquo;.
                    </p>

                    {clientPlan === 'premium' ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-xs space-y-2">
                        <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                          <Unlock className="w-4 h-4" />
                          🔓 RECURSO VIP DESBLOQUEADO COM SUCESSO!
                        </div>
                        <p className="text-emerald-200">
                          {isClientMode 
                            ? "⚠️ FALHA GRAVE: O usuário desbloqueou todo o conteúdo pago apenas alterando a chave no LocalStorage (F12) sem gastar R$ 1!"
                            : "✅ SESSÃO VÁLIDA: Acesso autenticado via token assinado no servidor com consulta segura ao banco."}
                        </p>
                        <div className="font-mono bg-black/40 p-2 rounded text-[11px] text-emerald-300">
                          {isClientMode 
                            ? "Payload vazado: { roi_calculator: true, stock_full_export: true, secret_margin_formula: '1.45x' }" 
                            : "Server Token: jwt_verified_signature_ok"}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-xs space-y-2">
                        <div className="font-bold text-red-400 flex items-center gap-1.5">
                          <Lock className="w-4 h-4" />
                          🔒 Conteúdo Bloqueado (Apenas Assinantes)
                        </div>
                        <p className="text-gray-400">
                          Assine o plano Premium por R$ 49/mês para visualizar os relatórios estratégicos.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Switch Protection Mode */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Modo de Implementação:</span>
                  <button
                    onClick={() => {
                      setIsClientMode(!isClientMode);
                      setClientPlan('free');
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
                      isClientMode 
                        ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30" 
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                    )}
                  >
                    {isClientMode ? (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        <span>VibeCoding Comum (Vulnerável)</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Mitigar IA (Blindado)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Side: Mock F12 Application / LocalStorage Tab */}
              <div className="lg:col-span-6 bg-[#09090c] border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-mono text-indigo-400 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4" />
                    DevTools &gt; Application &gt; Local Storage
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">F12 Console</span>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-gray-400">
                    Clique abaixo para simular o ataque do usuário alterando o valor no armazenamento local:
                  </p>

                  <div className="bg-[#111115] border border-white/10 rounded-lg overflow-hidden font-mono text-xs">
                    <div className="grid grid-cols-12 bg-white/5 p-2 font-bold text-gray-400 text-[11px] border-b border-white/5">
                      <div className="col-span-5">Key (Chave)</div>
                      <div className="col-span-7">Value (Valor)</div>
                    </div>

                    <div className="grid grid-cols-12 p-2.5 items-center border-b border-white/5">
                      <div className="col-span-5 text-gray-300">user_subscription</div>
                      <div className="col-span-7 flex items-center justify-between">
                        <span className={cn(
                          "font-bold px-1.5 py-0.5 rounded text-[11px]",
                          clientPlan === 'premium' ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                        )}>
                          &quot;{clientPlan}&quot;
                        </span>

                        <button
                          onClick={() => {
                            if (isClientMode) {
                              setClientPlan(clientPlan === 'free' ? 'premium' : 'free');
                            }
                          }}
                          disabled={!isClientMode}
                          className={cn(
                            "text-[11px] px-2 py-1 rounded transition-colors font-sans cursor-pointer",
                            isClientMode 
                              ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40"
                              : "bg-gray-800 text-gray-500 cursor-not-allowed opacity-50"
                          )}
                        >
                          {clientPlan === 'free' ? 'Forçar "premium"' : 'Voltar para "free"'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 p-2.5 items-center">
                      <div className="col-span-5 text-gray-400">auth_token_mode</div>
                      <div className="col-span-7 text-gray-500 text-[11px]">
                        {isClientMode ? "localStorage_raw (Inseguro)" : "httpOnly_Server_JWT (Seguro)"}
                      </div>
                    </div>
                  </div>

                  {/* Feedback explanation */}
                  <div className="text-xs p-3 rounded-lg bg-white/5 border border-white/10 text-gray-300 leading-relaxed">
                    {isClientMode ? (
                      <span>
                        🔴 <strong>Vulnerabilidade Ativa:</strong> Ao clicar em &ldquo;Forçar premium&rdquo;, o app leu o dado alterado e liberou o acesso pago sem consultar o servidor (Regra R16 violada).
                      </span>
                    ) : (
                      <span className="text-emerald-300">
                        🟢 <strong>Protegido pelo Mitigar IA:</strong> Mesmo que o usuário modifique o LocalStorage via F12, o servidor rejeita o payload porque a validação é conferida a cada requisição na API protegida.
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* DEMO 2: Sources & Exposed API Keys */}
          {activeTab === 'secrets' && (
            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Side: Search in Sources */}
              <div className="lg:col-span-6 bg-[#0a0a0c] border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-mono text-gray-300 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-indigo-400" />
                    DevTools &gt; Sources &gt; Ctrl+F Search
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">index.bundle.js</span>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-gray-400">
                    Digite um termo para pesquisar dentro do bundle JavaScript público gerado pelo VibeCoding:
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Buscar por: key, secret, token, stripe..."
                      className="flex-1 bg-[#15151a] border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => setIsProtectedSecrets(!isProtectedSecrets)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                        isProtectedSecrets ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"
                      )}
                    >
                      {isProtectedSecrets ? "Modo: Blindado" : "Modo: Vazando"}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="text-gray-500">Tente buscar:</span>
                    {['key', 'sk-proj', 'stripe', 'secret'].map(t => (
                      <button 
                        key={t} 
                        onClick={() => setSearchFilter(t)}
                        className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded border border-white/10 font-mono"
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Result List */}
                  <div className="bg-[#111115] border border-white/10 rounded-lg p-3 space-y-2 font-mono text-xs">
                    <div className="text-[11px] font-bold text-gray-400">
                      Resultados encontrados no arquivo .js público:
                    </div>

                    {!isProtectedSecrets ? (
                      <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 space-y-2">
                        <div className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          CHAVE MESTRA DA OPENAI EXPOSTA NO BUNDLE JS:
                        </div>
                        <HighlightCode
                          code={`// ❌ EXPOSTO NO NAVEGADOR:\nconst OPENAI_API_KEY = "sk-proj-98af38b9e8172c3d4a5b6c7d8e9f2a1b0c9d8e7f";\nconst stripeSecret = "sk_live_51P...99ax1";`}
                          language="javascript"
                          variant="vulnerable"
                          showLineNumbers={true}
                        />
                        <p className="text-[10px] text-red-400/90 font-sans">
                          Qualquer visitante com F12 pode copiar esta chave e consumir seus créditos ou clonar sua IA.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
                        <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          NENHUM SEGREDO OU CHAVE EXPOSTA NO CLIENTE!
                        </div>
                        <HighlightCode
                          code={`// ✅ PADRÃO SEGURO (Server-side proxy):\nexport async function POST(req: NextRequest) {\n  // Chaves mantidas em process.env no servidor\n  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });\n  return NextResponse.json({ ok: true });\n}`}
                          language="typescript"
                          variant="secure"
                          showLineNumbers={true}
                        />
                        <p className="text-[11px] text-emerald-200/90 font-sans">
                          O Mitigar IA converteu as chamadas diretas para um proxy seguro. O segredo vive apenas em variáveis de ambiente server-side.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Remediation Explained */}
              <div className="lg:col-span-6 bg-[#09090c] border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Como o Mitigar IA Neutraliza Isso
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Regra R03 & CTF-R06
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 text-xs text-gray-300 leading-relaxed">
                    <p>
                      Quando você analisa um repositório no <strong>Mitigar IA</strong>, nosso scanner estático de código procura padrões regex e AST de chaves privadas (OpenAI, Anthropic, Gemini, Stripe, Supabase Service Role).
                    </p>
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5 text-indigo-200 space-y-1.5">
                      <div className="font-bold text-white flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                        Geração Automática do Blueprint:
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11px]">
                        <li>Isola as credenciais no arquivo seguro <code className="font-mono text-indigo-300">.env.example</code></li>
                        <li>Cria a rota servidora intermediária em <code className="font-mono text-indigo-300">app/api/proxy/route.ts</code></li>
                        <li>Gera o patch (<code className="font-mono text-indigo-300">.patch</code>) para você aplicar em 1 comando no git.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-[11px] text-gray-400">
                  💡 <strong>Dica de Ouro:</strong> Nunca envie chaves de produção no chat com a IA sem que a plataforma tenha um cofre de segredos no servidor.
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </section>
  );
};
