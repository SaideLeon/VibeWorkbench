import { motion } from 'motion/react';
import { 
  AlertOctagon, 
  TrendingUp, 
  Users, 
  Flame, 
  FileWarning, 
  ShieldX, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const VibeCodingRealitySection = ({ onAuditClick }: { onAuditClick: () => void }) => {
  return (
    <section className="py-20 bg-[#0d0d10] border-b border-white/10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Flame className="w-3.5 h-3.5" />
            O Fenômeno do VibeCoding
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            A Revolução que Criou Milhares de Startups... e um <span className="text-red-400">Mar de Vulnerabilidades</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Nunca foi tão fácil criar um negócio digital. Com prompts em linguagem natural, qualquer pessoa sem conhecimento de programação coloca ideias no ar. Mas o código gerado por IA herda um ponto cego perigoso.
          </p>
        </div>

        {/* 2-Column Story: The Boom vs The Disaster */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Left Card: The VibeCoding Boom */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-[#121216] border border-white/10 rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">A Explosão Sem Precedentes</h3>
                  <p className="text-xs text-gray-400">Desde o tweet viral do cofundador da OpenAI</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                <p>
                  O termo <strong>VibeCoding</strong> ultrapassou 7 milhões de visualizações e inaugurou a era do desenvolvimento impulsionado por modelos de linguagem. No primeiro trimestre de 2026, houve um <strong>aumento de +84%</strong> no envio de novos aplicativos para lojas digitais.
                </p>
                <p>
                  Hoje, <strong>90% dos desenvolvedores</strong> já usam IA no dia a dia. Pessoas que nunca haviam escrito uma única linha de código estão lançando marketplaces, calculadoras, SaaS e redes sociais em questão de horas.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xl font-bold text-indigo-400">+84%</div>
                  <div className="text-xs text-gray-400 mt-0.5">Novos apps nas stores (Q1 2026)</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xl font-bold text-indigo-400">90%</div>
                  <div className="text-xs text-gray-400 mt-0.5">Devs usando IA ativamente</div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 text-xs text-indigo-300/80 font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Democratização total da criação de software.</span>
            </div>
          </motion.div>

          {/* Right Card: The Real Disaster (TiaApp Case) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-[#151214] border border-red-500/30 rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden group shadow-2xl"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <ShieldX className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">O Caso TiaApp (Julho 2025)</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">CASO REAL</span>
                  </div>
                  <p className="text-xs text-gray-400">1,6 milhão de usuários e 0 linhas escritas por humanos</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                <p>
                  O aplicativo <strong>TiaApp</strong> atingiu o topo de downloads da App Store mundial com mais de <strong>1,6 milhões de usuárias</strong>. O app permitia que mulheres avaliassem anonimamente encontros e, no cadastro, solicitava selfies e documentos com a promessa de exclusão imediata.
                </p>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-300 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-red-400">
                    <AlertOctagon className="w-4 h-4" />
                    O Desastre de Segurança:
                  </div>
                  <p>
                    Em julho de 2025, o aplicativo foi hackeado. <strong>Mais de 70.000 imagens de documentos de identidade, selfies e endereços residenciais</strong> foram vazados publicamente no 4chan. Usuárias sofreram perseguição de ex-parceiros e precisaram mudar de residência.
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  <strong>Por que aconteceu?</strong> O aplicativo foi gerado 100% por IA. Seus fundadores não sabiam programar e confiaram cegamente no código gerado, que não possuía isolamento de backend, RLS ou proteção de storage.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-red-500/20 flex items-center justify-between">
              <span className="text-xs text-red-400 font-semibold">O custo da falta de auditoria de código</span>
              <button
                onClick={onAuditClick}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                Evitar no meu app <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>

        </div>

        {/* Central Takeaway Quote */}
        <div className="mt-12 bg-[#121215] border border-white/10 rounded-xl p-6 text-center max-w-4xl mx-auto">
          <p className="text-base sm:text-lg font-medium text-gray-200">
            &ldquo;Não há como lutar contra a maré: o VibeCoding veio para ficar. A questão não é parar de usar IA, mas sim <span className="text-amber-400 font-bold">blindar a sua infraestrutura com regras reais de segurança</span> antes que um invasor encontre as brechas.&rdquo;
          </p>
        </div>

      </div>
    </section>
  );
};
