'use client';

import { useState } from 'react';
import { 
  X, 
  History, 
  FileText, 
  RotateCcw, 
  Copy, 
  Check, 
  Trash2, 
  ShieldAlert, 
  Database, 
  CheckCircle2, 
  Code2, 
  ExternalLink,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { StoredBlueprint } from '@/services/security';
import { cn } from '@/lib/utils';

interface BlueprintHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprints: StoredBlueprint[];
  isLoading: boolean;
  isSupabaseOnline: boolean;
  onRestoreBlueprint: (blueprint: StoredBlueprint) => void;
  onDeleteBlueprint: (id: string) => void;
}

export const BlueprintHistoryModal = ({
  isOpen,
  onClose,
  blueprints,
  isLoading,
  isSupabaseOnline,
  onRestoreBlueprint,
  onDeleteBlueprint,
}: BlueprintHistoryModalProps) => {
  const [activeTab, setActiveTab] = useState<'history' | 'schema'>('history');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyMarkdown = async (item: StoredBlueprint) => {
    try {
      await navigator.clipboard.writeText(item.blueprint_markdown);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // fallback
    }
  };

  const handleRestore = (item: StoredBlueprint) => {
    onRestoreBlueprint(item);
    setRestoredId(item.id);
    setTimeout(() => {
      setRestoredId(null);
      onClose();
    }, 800);
  };

  const sampleSchema = `-- ==============================================================================
-- MITIGAR IA - ESQUEMA SUPABASE COM HISTÓRICO DOS ÚLTIMOS 5 BLUEPRINTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.blueprint_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    project_name TEXT NOT NULL,
    title TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    summary TEXT,
    total_findings INTEGER NOT NULL DEFAULT 0,
    critical_count INTEGER NOT NULL DEFAULT 0,
    high_count INTEGER NOT NULL DEFAULT 0,
    medium_count INTEGER NOT NULL DEFAULT 0,
    blueprint_markdown TEXT NOT NULL,
    patch_content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TRIGGER AUTOMÁTICO: Mantém estritamente os últimos 5 blueprints
CREATE OR REPLACE FUNCTION public.prune_old_blueprints()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NOT NULL THEN
        DELETE FROM public.blueprint_history
        WHERE id IN (
            SELECT id FROM public.blueprint_history
            WHERE user_id = NEW.user_id
            ORDER BY created_at DESC
            OFFSET 5
        );
    ELSIF NEW.user_email IS NOT NULL THEN
        DELETE FROM public.blueprint_history
        WHERE id IN (
            SELECT id FROM public.blueprint_history
            WHERE user_email = NEW.user_email
            ORDER BY created_at DESC
            OFFSET 5
        );
    ELSE
        DELETE FROM public.blueprint_history
        WHERE id IN (
            SELECT id FROM public.blueprint_history
            WHERE project_name = NEW.project_name
            ORDER BY created_at DESC
            OFFSET 5
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prune_old_blueprints ON public.blueprint_history;
CREATE TRIGGER trigger_prune_old_blueprints
AFTER INSERT ON public.blueprint_history
FOR EACH ROW EXECUTE FUNCTION public.prune_old_blueprints();

-- RLS
ALTER TABLE public.blueprint_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem gerenciar seus 5 blueprints"
ON public.blueprint_history FOR ALL
USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = user_email OR user_id IS NULL);
`;

  const handleCopySchema = async () => {
    try {
      await navigator.clipboard.writeText(sampleSchema);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Histórico de Blueprints de Segurança</h3>
                <span className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Últimos 5 Salvos
                </span>
                {isSupabaseOnline ? (
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                    <Database className="w-2.5 h-2.5" />
                    Supabase Conectado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium" title="Em modo sandbox com retenção em memória/localStorage">
                    <Database className="w-2.5 h-2.5" />
                    Armazenamento Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Recupere instantaneamente qualquer um dos últimos 5 blueprints gerados pela IA para revisão ou download de patch.
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

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-white/5 bg-[#0d0d12]">
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer",
              activeTab === 'history'
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-gray-400 hover:text-gray-200"
            )}
          >
            <FileText className="w-4 h-4" />
            <span>Blueprints Arquivados ({blueprints.length}/5)</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={cn(
              "pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer",
              activeTab === 'schema'
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-gray-400 hover:text-gray-200"
            )}
          >
            <Code2 className="w-4 h-4" />
            <span>Esquema SQL Supabase</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'history' ? (
            <>
              {blueprints.length === 0 ? (
                <div className="p-10 border border-dashed border-white/10 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto text-gray-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Nenhum blueprint arquivado ainda</h4>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Assim que executar uma auditoria de segurança ou compilar o Blueprint de Remediação, o sistema salvará automaticamente o documento nesta lista (retendo os últimos 5 gerados).
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blueprints.map((item, index) => {
                    const dateFormatted = new Date(item.created_at).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    });
                    const isJustRestored = restoredId === item.id;

                    return (
                      <div
                        key={item.id || index}
                        className={cn(
                          "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                          isJustRestored
                            ? "bg-emerald-950/40 border-emerald-500/50"
                            : "bg-white/[0.02] border-white/10 hover:border-white/20"
                        )}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white truncate max-w-[280px]">
                              {item.project_name || 'Projecto'}
                            </span>
                            <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              {dateFormatted}
                            </span>
                            {index === 0 && (
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-semibold">
                                Mais Recente
                              </span>
                            )}
                          </div>

                          {item.title && (
                            <p className="text-xs text-gray-300 truncate">
                              {item.title}
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[11px] pt-1">
                            {item.critical_count > 0 && (
                              <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 font-semibold border border-red-500/30">
                                {item.critical_count} Crítico{item.critical_count > 1 ? 's' : ''}
                              </span>
                            )}
                            {item.high_count > 0 && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                                {item.high_count} Alto{item.high_count > 1 ? 's' : ''}
                              </span>
                            )}
                            {item.total_findings > 0 && (
                              <span className="text-gray-400">
                                Total: {item.total_findings} achados
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyMarkdown(item)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
                            title="Copiar Markdown integral"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteBlueprint(item.id)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 text-xs transition-colors cursor-pointer"
                            title="Remover este blueprint"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRestore(item)}
                            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                          >
                            {isJustRestored ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                <span>Recuperado!</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Recuperar Blueprint</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Supabase SQL Schema Viewer */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Esquema SQL da Tabela `blueprint_history` com Trigger Automático</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Este script cria a tabela no Supabase e instala a trigger PostgreSQL que descarta registros excedentes, garantindo apenas os últimos 5.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopySchema}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedSchema ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar SQL</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[360px]">
                {sampleSchema}
              </pre>

              <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/25 flex items-start gap-2.5 text-xs text-gray-300">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-white">Arquivo completo: </span>
                  O script SQL integral com todas as 5 tabelas (profiles, subscriptions, audits, audit_findings e blueprint_history) está salvo em <code className="text-indigo-300 bg-indigo-950/60 px-1 py-0.5 rounded font-mono">/supabase/schema.sql</code>.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
            <span>Retenção automática: máximo de 5 blueprints salvos por vez</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
