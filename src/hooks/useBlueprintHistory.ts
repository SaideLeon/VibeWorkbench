'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchRecentBlueprints, saveBlueprintToHistory, deleteBlueprintFromHistory, StoredBlueprint } from '@/services/security';

const LOCAL_STORAGE_HISTORY_KEY = 'mitigar_blueprint_history_v1';
const MAX_HISTORY = 5;

export function useBlueprintHistory(userEmail?: string, projectName?: string) {
  const [blueprints, setBlueprints] = useState<StoredBlueprint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupabaseOnline, setIsSupabaseOnline] = useState(false);

  // Carrega do localStorage imediatamente para renderização rápida
  const loadLocalCached = useCallback(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, MAX_HISTORY);
        }
      }
    } catch {
      // ignore
    }
    return [];
  }, []);

  const saveToLocalCached = useCallback((items: StoredBlueprint[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
    } catch {
      // ignore
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchRecentBlueprints(userEmail, projectName);
      setIsSupabaseOnline(result.supabaseConnected);

      if (result.blueprints && result.blueprints.length > 0) {
        setBlueprints(result.blueprints.slice(0, MAX_HISTORY));
        saveToLocalCached(result.blueprints.slice(0, MAX_HISTORY));
      } else {
        const local = loadLocalCached();
        setBlueprints(local);
      }
    } catch (err) {
      console.warn('Erro ao atualizar histórico de blueprints:', err);
      const local = loadLocalCached();
      setBlueprints(local);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, projectName, loadLocalCached, saveToLocalCached]);

  useEffect(() => {
    const initial = loadLocalCached();
    if (initial.length > 0) {
      setBlueprints(initial);
    }
    refreshHistory();
  }, [refreshHistory, loadLocalCached]);

  const recordBlueprint = useCallback(async (payload: {
    projectName: string;
    title?: string;
    summary?: string;
    totalFindings?: number;
    criticalCount?: number;
    highCount?: number;
    mediumCount?: number;
    blueprintMarkdown: string;
    patchContent?: string;
    userEmail?: string;
  }) => {
    if (!payload.blueprintMarkdown) return;

    // Atualização otimista local mantendo estritamente os últimos 5
    const optimisticItem: StoredBlueprint = {
      id: `local_bp_${Date.now()}`,
      project_name: payload.projectName,
      title: payload.title || `Blueprint - ${payload.projectName}`,
      version_number: 1,
      summary: payload.summary,
      total_findings: payload.totalFindings ?? 0,
      critical_count: payload.criticalCount ?? 0,
      high_count: payload.highCount ?? 0,
      medium_count: payload.mediumCount ?? 0,
      blueprint_markdown: payload.blueprintMarkdown,
      patch_content: payload.patchContent,
      user_email: payload.userEmail || userEmail,
      created_at: new Date().toISOString(),
    };

    setBlueprints((prev) => {
      const updated = [optimisticItem, ...prev.filter(b => b.id !== optimisticItem.id)].slice(0, MAX_HISTORY);
      saveToLocalCached(updated);
      return updated;
    });

    // Persiste no backend / Supabase
    try {
      const saved = await saveBlueprintToHistory({
        ...payload,
        userEmail: payload.userEmail || userEmail,
      });
      if (saved) {
        setBlueprints((prev) => {
          const updated = [saved, ...prev.filter(b => b.id !== saved.id && b.id !== optimisticItem.id)].slice(0, MAX_HISTORY);
          saveToLocalCached(updated);
          return updated;
        });
      }
    } catch (err) {
      console.warn('Falha na persistência remota do blueprint:', err);
    }
  }, [userEmail, saveToLocalCached]);

  const removeBlueprint = useCallback(async (id: string) => {
    setBlueprints((prev) => {
      const updated = prev.filter(b => b.id !== id);
      saveToLocalCached(updated);
      return updated;
    });

    try {
      await deleteBlueprintFromHistory(id);
    } catch (err) {
      console.warn('Erro ao deletar blueprint remoto:', err);
    }
  }, [saveToLocalCached]);

  return {
    blueprints,
    isLoading,
    isSupabaseOnline,
    refreshHistory,
    recordBlueprint,
    removeBlueprint,
  };
}
