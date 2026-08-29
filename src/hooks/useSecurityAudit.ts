import { useState, useCallback } from 'react';
import { SecurityAuditResult } from '@/types';
import { runSecurityAuditStream, runSecurityAudit, generateSecurityBlueprint, generateSecurityPatch } from '@/services/security';
import { githubApi } from '@/services/github.api';
import { limitTextContext } from '@/utils/textLimiter';

export interface AuditProgress {
  phase: 'idle' | 'fetching' | 'auditing' | 'generating_blueprint' | 'generating_patch';
  current?: number;
  total?: number;
  message?: string;
  activeFilePath?: string;
  activeFileIndex?: number;
}

export interface CreatedPullRequestInfo {
  id: number;
  number: number;
  html_url: string;
  title: string;
  state: string;
  branch: string;
  baseBranch: string;
  filesCount: number;
}

export function useSecurityAudit() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [isHarnessAuditMode, setIsHarnessAuditMode] = useState(true);
  const [auditProgress, setAuditProgress] = useState<AuditProgress>({ phase: 'idle' });
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [blueprintMarkdown, setBlueprintMarkdown] = useState<string | null>(null);
  const [patchContent, setPatchContent] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [isGeneratingPatch, setIsGeneratingPatch] = useState(false);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [createdPR, setCreatedPR] = useState<CreatedPullRequestInfo | null>(null);
  const [lastContextFiles, setLastContextFiles] = useState<{ path: string; content: string }[]>([]);

  const toggleHarnessAuditMode = useCallback(() => {
    setIsHarnessAuditMode(prev => !prev);
  }, []);

  const runAudit = useCallback(async (
    files: { path: string; content: string }[],
    projectName: string,
    apiKey?: string,
    overrideHarnessMode?: boolean
  ) => {
    setIsAuditing(true);
    setAuditError(null);
    setBlueprintMarkdown(null);
    setPatchContent(null);
    setCreatedPR(null);
    const activeHarness = overrideHarnessMode ?? isHarnessAuditMode;
    setAuditProgress({ 
      phase: 'auditing', 
      message: activeHarness 
        ? `[DeepSeek-Harness] A construir AST de segurança para ${files.length} ficheiro(s)...`
        : `A analisar ${files.length} ficheiro(s) contra catálogo de segurança...` 
    });

    try {
      const limitedFiles = files.map((f) => ({ path: f.path, content: limitTextContext(f.content, 600) }));
      setLastContextFiles(limitedFiles);

      // Executa via Streaming Real SSE
      const streamRes = await runSecurityAuditStream(
        limitedFiles,
        projectName,
        apiKey,
        activeHarness,
        {
          onFileScanStart: (data) => {
            setAuditProgress(prev => ({
              ...prev,
              phase: 'auditing',
              current: data.fileIndex + 1,
              total: data.totalFiles,
              activeFilePath: data.filePath,
              activeFileIndex: data.fileIndex,
              message: `Varrendo AST em ${data.fileName} (${data.fileIndex + 1}/${data.totalFiles})...`
            }));
          },
          onStatus: (data) => {
            setAuditProgress(prev => ({
              ...prev,
              phase: data.phase as any,
              message: data.message
            }));
          },
          onAuditResult: (res) => {
            setAuditResult(res);
          },
          onBlueprintResult: (bp) => {
            setBlueprintMarkdown(bp);
          }
        }
      );

      setAuditResult(streamRes.auditResult);
      let finalMarkdown = streamRes.blueprintMarkdown;

      // Fallback de segurança: Se o stream não retornou blueprintMarkdown por queda de conexão, gera sob demanda
      if (!finalMarkdown && streamRes.auditResult?.findings) {
        try {
          setIsGeneratingBlueprint(true);
          finalMarkdown = await generateSecurityBlueprint(
            streamRes.auditResult.findings,
            limitedFiles,
            projectName,
            apiKey
          );
        } catch (bpErr) {
          console.warn('Fallback de geração de Blueprint falhou:', bpErr);
        } finally {
          setIsGeneratingBlueprint(false);
        }
      }

      setBlueprintMarkdown(finalMarkdown || '');

      // Passo de geração de patch defensivo com base no Blueprint
      if (finalMarkdown) {
        try {
          const patch = await generateSecurityPatch(
            finalMarkdown,
            projectName,
            apiKey
          );
          setPatchContent(patch);
        } catch (patchErr) {
          console.warn('Patch pré-gerado falhou, ficará disponível sob demanda:', patchErr);
        }
      }

      return { auditResult: streamRes.auditResult, blueprint: finalMarkdown || '' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido na auditoria e blueprint.';
      setAuditError(message);
      throw err;
    } finally {
      setIsAuditing(false);
      setIsGeneratingBlueprint(false);
      setAuditProgress({ phase: 'idle' });
    }
  }, [isHarnessAuditMode]);

  const compileBlueprintOnDemand = useCallback(async (projectName: string, apiKey?: string): Promise<string> => {
    if (blueprintMarkdown) {
      return blueprintMarkdown;
    }
    if (!auditResult) {
      throw new Error('Nenhuma auditoria realizada anteriormente para compilar o Blueprint.');
    }

    setIsGeneratingBlueprint(true);
    try {
      const markdown = await generateSecurityBlueprint(
        auditResult.findings,
        lastContextFiles,
        projectName,
        apiKey
      );
      setBlueprintMarkdown(markdown);
      return markdown;
    } finally {
      setIsGeneratingBlueprint(false);
    }
  }, [auditResult, blueprintMarkdown, lastContextFiles]);

  const generatePatch = useCallback(async (projectName: string, apiKey?: string): Promise<string> => {
    if (patchContent) {
      return patchContent;
    }
    if (!blueprintMarkdown) {
      throw new Error('Nenhum Blueprint de segurança gerado anteriormente para converter em patch.');
    }

    setIsGeneratingPatch(true);
    try {
      const patch = await generateSecurityPatch(
        blueprintMarkdown,
        projectName,
        apiKey
      );
      setPatchContent(patch);
      return patch;
    } finally {
      setIsGeneratingPatch(false);
    }
  }, [blueprintMarkdown, patchContent]);

  const downloadPatch = useCallback(async (projectName: string, apiKey?: string) => {
    let patch = patchContent;

    if (!patch) {
      if (!blueprintMarkdown) {
        throw new Error('Nenhum Blueprint gerado anteriormente para baixar o patch correspondente.');
      }
      setIsGeneratingPatch(true);
      try {
        patch = await generateSecurityPatch(
          blueprintMarkdown,
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
  }, [blueprintMarkdown, patchContent]);

  const createPullRequest = useCallback(async (
    owner: string,
    repo: string,
    baseBranch?: string,
    apiKey?: string
  ): Promise<CreatedPullRequestInfo> => {
    if (!blueprintMarkdown && !patchContent) {
      throw new Error('Execute a auditoria de segurança antes de abrir o Pull Request.');
    }

    setIsCreatingPR(true);
    try {
      const res = await githubApi.createPullRequest({
        owner,
        repo,
        baseBranch,
        blueprintMarkdown: blueprintMarkdown || undefined,
        patchContent: patchContent || undefined,
        apiKey,
      });

      setCreatedPR(res.pullRequest);
      return res.pullRequest;
    } finally {
      setIsCreatingPR(false);
    }
  }, [blueprintMarkdown, patchContent]);

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
    setCreatedPR(null);
    setAuditError(null);
    setAuditProgress({ phase: 'idle' });
  }, []);

  return {
    isAuditing,
    isHarnessAuditMode,
    toggleHarnessAuditMode,
    auditProgress,
    setAuditProgress,
    auditResult,
    blueprintMarkdown,
    patchContent,
    auditError,
    isGeneratingBlueprint,
    isGeneratingPatch,
    isCreatingPR,
    createdPR,
    lastContextFiles,
    runAudit,
    compileBlueprintOnDemand,
    downloadBlueprint,
    downloadPatch,
    generatePatch,
    createPullRequest,
    resetAudit,
  };
}

