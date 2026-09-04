import React from 'react';
import { 
  Compass, 
  KeyRound, 
  ShieldCheck, 
  Database, 
  DollarSign, 
  UploadCloud, 
  Lock, 
  CheckCircle2, 
  Layers, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { AuditTerrainMap, TopCriticalRemediation, SecurityFinding } from '@/types';
import { AUDIT_STAGES } from '@/server/security/ruleset';
import { cn } from '@/lib/utils';

interface TerrainMapCardProps {
  terrainMap?: AuditTerrainMap | null;
  topCriticalRemediations?: TopCriticalRemediation[];
  findings?: SecurityFinding[];
  existingTestPaths?: string[];
  onOpenFile?: (path: string) => void;
}

const AXIS_ICONS: Record<string, any> = {
  autenticacao: KeyRound,
  autorizacao: ShieldCheck,
  bancoDeDados: Database,
  financeiro: DollarSign,
  uploads: UploadCloud,
  secrets: Lock,
};

const AXIS_COLORS: Record<string, { badge: string; border: string; text: string; iconBg: string }> = {
  autenticacao: { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30', border: 'border-blue-500/30', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
  autorizacao: { badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30', border: 'border-purple-500/30', text: 'text-purple-400', iconBg: 'bg-purple-500/20' },
  bancoDeDados: { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', border: 'border-amber-500/30', text: 'text-amber-400', iconBg: 'bg-amber-500/20' },
  financeiro: { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', border: 'border-emerald-500/30', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20' },
  uploads: { badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', border: 'border-cyan-500/30', text: 'text-cyan-400', iconBg: 'bg-cyan-500/20' },
  secrets: { badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30', border: 'border-rose-500/30', text: 'text-rose-400', iconBg: 'bg-rose-500/20' },
};

export const TerrainMapCard: React.FC<TerrainMapCardProps> = ({
  terrainMap,
  topCriticalRemediations,
  findings = [],
  existingTestPaths = [],
  onOpenFile,
}) => {
  if (!terrainMap) {
    return null;
  }

  const axisList = Object.values(terrainMap.axes || {});

  return (
    <div className="space-y-6">
      {/* Header Banner: Etapa 1 E-book */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Etapa 1: Preparar o Terreno da Auditoria
                </h3>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-medium border border-indigo-500/30">
                  {terrainMap.coveredAxesCount} de 6 Eixos Mapeados
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
                Mapeamento estrutural dos 6 eixos de maior risco antes do scan profundo, garantindo cobertura total sem tokens desperdiçados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 text-xs">
            <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-gray-300">
              <span className="text-gray-500">Arquivos:</span> <strong className="text-white">{terrainMap.totalFilesAnalyzed}</strong>
            </div>
            {existingTestPaths.length > 0 && (
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <span className="text-emerald-500">Testes Existentes:</span> <strong className="text-emerald-200">{existingTestPaths.length}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6 Eixos Fundamentais do E-book */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Os 6 Eixos Fundamentais Mapeados</span>
          </h4>
          <span className="text-[11px] text-gray-500">
            Metodologia E-book Vibe Coding
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {axisList.map((axis) => {
            const Icon = AXIS_ICONS[axis.id] || Compass;
            const style = AXIS_COLORS[axis.id] || AXIS_COLORS.autenticacao;
            const hasFiles = axis.files && axis.files.length > 0;

            return (
              <div
                key={axis.id}
                className={cn(
                  "p-3.5 rounded-xl border transition-all flex flex-col justify-between",
                  hasFiles 
                    ? "bg-[#161616] border-white/10 hover:border-white/20" 
                    : "bg-white/[0.02] border-white/5 opacity-60"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", style.iconBg, style.text)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-gray-200">
                        {axis.name}
                      </span>
                    </div>

                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-mono", style.badge)}>
                      {axis.fileCount} arq.
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
                    {axis.description}
                  </p>
                </div>

                {hasFiles ? (
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                      Ficheiros Identificados:
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                      {axis.files.map((fileObj, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-gray-300 hover:text-white bg-white/5 px-1.5 py-0.5 rounded"
                        >
                          <span className="truncate max-w-[170px]" title={fileObj.path}>
                            {fileObj.path}
                          </span>
                          {onOpenFile && (
                            <button
                              type="button"
                              onClick={() => onOpenFile(fileObj.path)}
                              className="text-[9px] text-indigo-400 hover:text-indigo-300 ml-1 underline cursor-pointer shrink-0"
                            >
                              ver
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-gray-500 italic">
                    Nenhum componente crítico detectado neste eixo no escopo analisado.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 3 Ações Críticas Imediatas (Etapa 7 / Exercício 7 do E-book) */}
      {topCriticalRemediations && topCriticalRemediations.length > 0 && (
        <div className="bg-[#151515] border border-red-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Etapa 7: Plano de Ação Imediato (Top {topCriticalRemediations.length} Prioridades Críticas)</span>
            </h4>
            <span className="text-[10px] bg-red-500/15 text-red-300 px-2 py-0.5 rounded border border-red-500/30 font-semibold">
              Exercício 7 do E-book
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topCriticalRemediations.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-black/30 border border-white/10 rounded-lg p-3 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      Prioridade #{idx + 1}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      {item.rule}
                    </span>
                  </div>

                  <h5 className="text-xs font-semibold text-gray-200 mt-2 line-clamp-2" title={item.name}>
                    {item.name}
                  </h5>

                  <p className="text-[11px] text-gray-400 mt-1 font-mono text-xs truncate" title={item.location}>
                    📍 {item.location}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-white/5 space-y-1 text-[11px]">
                  <div className="text-gray-300">
                    <strong className="text-red-300">Ação:</strong> {item.action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* As 7 Etapas da Auditoria de Segurança para Vibe Coding */}
      <div className="bg-[#141414] border border-white/10 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Pipeline de 7 Etapas do E-book</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {AUDIT_STAGES.map((stg) => {
            return (
              <div 
                key={stg.stageNumber}
                className="bg-white/5 border border-white/5 rounded-lg p-2.5 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
                      Etapa {stg.stageNumber}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                  <div className="font-semibold text-gray-200 text-[11px]">
                    {stg.title}
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 mt-1 line-clamp-2">
                  {stg.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
