import { useState, useCallback } from 'react';
import { githubApi } from '@/services/github.api';

export interface CommitItem {
  sha: string;
  shortSha: string;
  message: string;
  author: {
    name: string;
    avatar_url: string | null;
    date: string | null;
  };
  html_url: string;
  isHead: boolean;
  parents: string[];
}

export function useGithubRollback() {
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommits = useCallback(async (owner: string, repo: string, branch?: string) => {
    setIsLoadingCommits(true);
    setError(null);
    try {
      const data = await githubApi.getCommits(owner, repo, branch);
      setCommits(data);
      return data;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Falha ao buscar histórico de commits.';
      setError(msg);
      throw err;
    } finally {
      setIsLoadingCommits(false);
    }
  }, []);

  const rollbackToCommit = useCallback(async (params: {
    owner: string;
    repo: string;
    branch?: string;
    targetSha: string;
    mode?: 'force_reset' | 'safe_revert';
  }) => {
    setIsRollingBack(true);
    setError(null);
    try {
      const res = await githubApi.rollbackCommit(params);
      // Re-fetch commits to update list
      await fetchCommits(params.owner, params.repo, params.branch);
      return res;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Falha ao reverter commit.';
      setError(msg);
      throw err;
    } finally {
      setIsRollingBack(false);
    }
  }, [fetchCommits]);

  return {
    commits,
    isLoadingCommits,
    isRollingBack,
    error,
    fetchCommits,
    rollbackToCommit,
  };
}
