import { useState, useCallback } from 'react';
import { githubApi } from '@/services/github.api';

export interface HistoryLeakItem {
  commitSha: string;
  commitShortSha: string;
  commitMessage: string;
  author: {
    name: string;
    date: string | null;
  };
  filePath: string;
  fileType: string;
  isNonObvious: boolean;
  provider: string;
  patternName: string;
  ruleId: string;
  severity: string;
  maskedSecret: string;
  rawSecret?: string;
  rawSecretPreview: string;
  lineSnippet: string;
  lineNumber?: number;
  changeType: 'added' | 'modified';
  patchHunkHeader?: string;
}

export interface HistoryAuditSummary {
  totalLeaks: number;
  providers: Record<string, number>;
  nonObviousCount: number;
  criticalCount: number;
  highCount: number;
}

export function useGitHistoryAudit() {
  const [isAuditingHistory, setIsAuditingHistory] = useState(false);
  const [historyLeaks, setHistoryLeaks] = useState<HistoryLeakItem[]>([]);
  const [historySummary, setHistorySummary] = useState<HistoryAuditSummary | null>(null);
  const [scannedCommitsCount, setScannedCommitsCount] = useState(0);
  const [historyAuditError, setHistoryAuditError] = useState<string | null>(null);

  const runHistoryAudit = useCallback(async (params: {
    owner: string;
    repo: string;
    branch?: string;
    maxCommits?: number;
  }) => {
    setIsAuditingHistory(true);
    setHistoryAuditError(null);
    setHistoryLeaks([]);
    setHistorySummary(null);

    try {
      const data = await githubApi.auditHistory(params);
      setHistoryLeaks(data.leaks || []);
      setHistorySummary(data.summary || null);
      setScannedCommitsCount(data.scannedCommitsCount || 0);
      return data;
    } catch (err: any) {
      const msg = err.message || 'Falha ao auditar histórico de commits.';
      setHistoryAuditError(msg);
      throw err;
    } finally {
      setIsAuditingHistory(false);
    }
  }, []);

  const clearHistoryAudit = useCallback(() => {
    setHistoryLeaks([]);
    setHistorySummary(null);
    setScannedCommitsCount(0);
    setHistoryAuditError(null);
  }, []);

  return {
    isAuditingHistory,
    historyLeaks,
    historySummary,
    scannedCommitsCount,
    historyAuditError,
    runHistoryAudit,
    clearHistoryAudit,
  };
}
