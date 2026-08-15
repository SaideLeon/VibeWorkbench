import { useState, useCallback } from 'react';
import { SecurityAuditResult } from '@/types';
import { runSecurityAudit, generateSecurityBlueprint, generateSecurityPatch } from '@/services/security';
import { limitTextContext } from '@/utils/textLimiter';

export interface AuditProgress {
  phase: 'idle' | 'fetching' | 'auditing' | 'generating_blueprint' | 'generating_patch';
  current?: number;
  total?: number;
  message?: string;
}

export function useSecurityAudit() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState<AuditProgress>({ phase: 'idle' });
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [blueprintMarkdown, setBlueprintMarkdown] = useState<string | null>(null);
  const [patchContent, setPatchContent] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [isGeneratingPatch, setIsGeneratingPatch] = useState(false);
  const [lastContextFiles, setLastContextFiles] = useState<{ path: string; content: string }[]>([]);

  const runAudit = useCallback(async (
    files: { path: string; content: string }[],
    projectName: string,
    apiKey?: string
  ) => {
    setIsAuditing(true);
    setAuditError(null);
    setBlueprintMarkdown(null);
    setPatchContent(null);
    setAuditProgress({ 
      phase: 'auditing', 
      message: `A analisar ${files.length} ficheiro(s) contra catálogo de segurança...` 
    });

    try {
      const limitedFiles = files.map((f) => ({ path: f.path, content: limitTextContext(f.content, 600) }));
      setLastContextFiles(limitedFiles);

      // Passo 1: Executar a auditoria e cálculo de score
      const result = await runSecurityAudit(limitedFiles, projectName, apiKey);
      setAuditResult(result);

      // Passo 2: Imediatamente a seguir, no mesmo fluxo ininterrupto, gerar o Blueprint detalhado
      setAuditProgress({ 
        phase: 'generating_blueprint', 
        message: 'A gerar Blueprint detalhado com resoluções completas e testes...' 
      });

      const blueprintMd = await generateSecurityBlueprint(
        result.findings,
        limitedFiles,
        projectName,
        apiKey
      );

      setBlueprintMarkdown(blueprintMd);
      return { auditResult: result, blueprint: blueprintMd };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido na auditoria e blueprint.';
      setAuditError(message);
      throw err;
    } finally {
      setIsAuditing(false);
      setAuditProgress({ phase: 'idle' });
    }
  }, []);

  const generatePatch = useCallback(async (projectName: string, apiKey?: string): Promise<string> => {
    if (!auditResult) {
      throw new Error('Nenhuma auditoria realizada.');
    }
    if (patchContent) {
      return patchContent;
    }

    setIsGeneratingPatch(true);
    try {
      const patch = await generateSecurityPatch(
        auditResult.findings,
        lastContextFiles,
        projectName,
        apiKey
      );
      setPatchContent(patch);
      return patch;
    } finally {
      setIsGeneratingPatch(false);
    }
  }, [auditResult, lastContextFiles, patchContent]);

  const downloadPatch = useCallback(async (projectName: string, apiKey?: string) => {
    if (!auditResult) return;

    let patch = patchContent;

    if (!patch) {
      setIsGeneratingPatch(true);
      try {
        patch = await generateSecurityPatch(
          auditResult.findings,
          lastContextFiles,
          projectName,
          apiKey
        );
        setPatchContent(patch);
      } finally {
        setIsGeneratingPatch(false);
      }
    }

    if (patch) {
      const blob = new Blob([patch], { type: 'text/x-diff;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanProject = (projectName || 'project').replace(/[^a-z0-9-]+/gi, '-');
      a.download = `security-remediation-${cleanProject}.patch`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [auditResult, patchContent, lastContextFiles]);

  const downloadBlueprint = useCallback(async (projectName: string, apiKey?: string) => {
    if (!auditResult) return;

    let markdown = blueprintMarkdown;

    if (!markdown) {
      setIsGeneratingBlueprint(true);
      try {
        markdown = await generateSecurityBlueprint(
          auditResult.findings,
          lastContextFiles,
          projectName,
          apiKey
        );
        setBlueprintMarkdown(markdown);
      } finally {
        setIsGeneratingBlueprint(false);
      }
    }

    if (markdown) {
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanProject = (projectName || 'project').replace(/[^a-z0-9-]+/gi, '-');
      a.download = `security-blueprint-${cleanProject}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [auditResult, blueprintMarkdown, lastContextFiles]);

  const resetAudit = useCallback(() => {
    setAuditResult(null);
    setBlueprintMarkdown(null);
    setPatchContent(null);
    setAuditError(null);
    setAuditProgress({ phase: 'idle' });
  }, []);

  return {
    isAuditing,
    auditProgress,
    setAuditProgress,
    auditResult,
    blueprintMarkdown,
    patchContent,
    auditError,
    isGeneratingBlueprint,
    isGeneratingPatch,
    lastContextFiles,
    runAudit,
    downloadBlueprint,
    downloadPatch,
    generatePatch,
    resetAudit,
  };
}

