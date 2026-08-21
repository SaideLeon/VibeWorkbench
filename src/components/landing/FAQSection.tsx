import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'O que é VibeCoding e por que a IA gera código com vulnerabilidades graves?',
    answer: 'VibeCoding é a prática de criar aplicativos inteiros apenas conversando com Inteligências Artificiais em linguagem natural, sem necessariamente dominar código manual. Os modelos de linguagem (LLMs) são otimizados para gerar código que "funcione visualmente na tela" o mais rápido possível. Eles não possuem senso de infraestrutura real e frequentemente colocam chaves de API no front-end, validam assinaturas VIP no navegador do usuário e esquecem regras de banco de dados (RLS), gerando as 7 falhas invisíveis documentadas.'
  },
  {
    question: 'Como o Mitigar IA analisa meu repositório do GitHub?',
    answer: 'Ao colar o link de um repositório público ou conectar seu GitHub via OAuth para repositórios privados, nosso sistema extrai a árvore de arquivos, realiza análise estática de código (AST) e submete os arquivos a um motor de raciocínio de IA configurado com um catálogo rígido de 36 regras de segurança (R01–R25 e CTF-R01–R11). A IA é forçada a categorizar apenas vulnerabilidades reais com evidências e nunca inventa regras ou severidades por conta própria.'
  },
  {
    question: 'O que é um Blueprint de Segurança e o arquivo .patch?',
    answer: 'O Blueprint de Segurança é um relatório técnico completo em Markdown detalhando cada falha encontrada, a regra violada, a localização no código e o plano de remediação. Junto com o Blueprint, o Mitigar IA gera um arquivo .patch no formato padrão do Git (diff unificado). Com um único comando ("git apply security-remediation.patch"), você aplica as correções de código diretamente no seu repositório.'
  },
  {
    question: 'Eu não sou programador experiente. Consigo usar o Mitigar IA?',
    answer: 'Sim, absolutamente! O Mitigar IA foi desenhado tanto para criadores sem formação técnica quanto para engenheiros de software seniores. As explicações vêm acompanhadas de analogias práticas, o Score de Segurança de 0 a 100 indica de forma cristalina se o app está aprovado ou reprovado para produção, e as instruções mostram o passo a passo exato para blindar seu projeto.'
  },
  {
    question: 'Por que uma instrução em texto (prompt) não é suficiente para impedir que a IA destrua dados?',
    answer: 'Como demonstrado no caso histórico da SaaStr com o Replit Agent, instruções textuais como "NÃO ALTERE O BANCO" dependem da interpretação estatística da IA, que pode entrar em pânico ou alucinar sob pressão. A verdadeira segurança exige "fechaduras de infraestrutura": isolamento físico de ambientes (Dev/Prod), permissões restritivas de banco e portões de aprovação humana (Human-in-the-Loop) antes de qualquer comando destrutivo.'
  },
  {
    question: 'Quais linguagens e frameworks o Mitigar IA suporta?',
    answer: 'Suportamos JavaScript, TypeScript, React, Next.js, Vue, Node.js, Python, Supabase, PostgreSQL, Tailwind, Express, HTML/CSS e migrações de bancos de dados relacionais e serverless.'
  },
  {
    question: 'Minhas chaves de API e códigos do repositório ficam seguros na plataforma?',
    answer: 'Sim. As análises são processadas exclusivamente no servidor com proteção total de chaves e conexão efêmera. Nenhuma credencial privada ou dado sensível do seu repositório é compartilhado ou exposto no cliente.'
  }
];

export const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-[#0a0a0d] border-b border-white/10 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Perguntas Frequentes sobre <span className="text-indigo-400">VibeCoding Seguro</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Respostas diretas e esclarecedoras sobre como blindar seus projetos criados com inteligência artificial.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={faq.question}
                className={cn(
                  "border rounded-xl transition-all overflow-hidden",
                  isOpen ? "bg-[#141418] border-indigo-500/30 shadow-lg" : "bg-[#111115] border-white/10 hover:border-white/20"
                )}
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold text-gray-100">
                    {faq.question}
                  </span>
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200",
                    isOpen ? "bg-indigo-500/20 text-indigo-300" : "bg-white/5 text-gray-400"
                  )}>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-white/5">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
