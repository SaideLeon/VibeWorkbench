'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Keyboard, X, Sparkles, Shield, MessageSquare, FolderTree } from 'lucide-react';

interface ShortcutGroup {
  category: string;
  icon: any;
  items: {
    keys: string[];
    description: string;
  }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'Auditoria & Segurança',
    icon: Shield,
    items: [
      {
        keys: ['Ctrl', 'S'],
        description: 'Executar auditoria nos arquivos selecionados'
      },
      {
        keys: ['Ctrl', 'Shift', 'A'],
        description: 'Executar auditoria completa em todo o projeto'
      },
      {
        keys: ['Ctrl', 'G'],
        description: 'Baixar Blueprint & Patch de remediação'
      }
    ]
  },
  {
    category: 'Navegação & Painéis',
    icon: FolderTree,
    items: [
      {
        keys: ['Ctrl', '1'],
        description: 'Alternar para painel do Chat com IA'
      },
      {
        keys: ['Ctrl', '2'],
        description: 'Alternar para painel de Auditoria'
      },
      {
        keys: ['Ctrl', 'B'],
        description: 'Abrir / Fechar árvore de arquivos'
      },
      {
        keys: ['Ctrl', 'H'],
        description: 'Abrir histórico de commits & rollback'
      }
    ]
  },
  {
    category: 'Chat & Edição',
    icon: MessageSquare,
    items: [
      {
        keys: ['Ctrl', 'Enter'],
        description: 'Enviar mensagem ou prompt no chat'
      },
      {
        keys: ['Shift', 'Enter'],
        description: 'Adicionar quebra de linha no chat'
      },
      {
        keys: ['Esc'],
        description: 'Fechar modais / cancelar visualização'
      },
      {
        keys: ['?'],
        description: 'Abrir esta central de atalhos'
      }
    ]
  }
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal = ({ isOpen, onClose }: KeyboardShortcutsModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl bg-[#111116] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#16161d]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Atalhos de Teclado Globais
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Produtividade
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Aumente sua agilidade ao auditar e navegar pelos repositórios no Mitigar IA.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Groups Grid */}
            <div className="p-6 overflow-y-auto space-y-6">
              {SHORTCUT_GROUPS.map((group) => {
                const Icon = group.icon;
                return (
                  <div key={group.category} className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-wider">
                      <Icon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{group.category}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {group.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-colors"
                        >
                          <span className="text-xs text-gray-300">{item.description}</span>
                          <div className="flex items-center gap-1">
                            {item.keys.map((k, ki) => (
                              <kbd
                                key={ki}
                                className="px-2 py-1 bg-[#1a1a22] border border-white/15 rounded-md text-[11px] font-mono text-gray-200 font-bold shadow-sm shadow-black/40 min-w-[24px] text-center"
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#14141a] border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Pressione <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded font-mono text-[10px] text-gray-300">?</kbd> a qualquer momento para reabrir
              </span>

              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
