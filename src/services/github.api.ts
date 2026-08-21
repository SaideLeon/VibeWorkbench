import { RepoTreeResponse } from '@/types';

const fileCache = new Map<string, string>();

const getAuthHeaders = () => {
  const token = localStorage.getItem('github_token');
  return token ? { 'x-github-token': token } : {};
};

export const githubApi = {
  async getUserRepos(): Promise<any[]> {
    const headers = getAuthHeaders();
    if (!headers['x-github-token']) return [];

    const res = await fetch('/api/github/repos', { headers });
    if (!res.ok) {
        let errorMsg = "Falha ao buscar repositórios do GitHub";
        try {
            const errData = await res.json();
            errorMsg = errData.error || errData.message || errorMsg;
        } catch {
            errorMsg += ` (${res.status} ${res.statusText})`;
        }
        throw new Error(errorMsg);
    }
    return res.json();
  },

  async getTree(owner: string, repo: string): Promise<RepoTreeResponse> {
    const res = await fetch(`/api/github/tree?owner=${owner}&repo=${repo}`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) {
      let errorMsg = "Falha ao buscar repositório.";
      try {
        const errData = await res.json();
        errorMsg = errData.error || errData.message || errorMsg;
      } catch {
        if (res.status === 404) {
          errorMsg = `Repositório "${owner}/${repo}" não encontrado ou privado. Se for privado, adicione um GitHub Token nas configurações.`;
        } else if (res.status === 401) {
          errorMsg = "Token do GitHub inválido ou expirado. Atualize ou remova seu token nas configurações.";
        } else if (res.status === 403) {
          errorMsg = "Limite de requisições da API do GitHub excedido. Adicione um GitHub Token nas configurações para aumentar o limite.";
        } else {
          errorMsg += ` (${res.status} ${res.statusText})`;
        }
      }
      
      throw new Error(errorMsg);
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Recebeu resposta não-JSON do servidor.");
    }

    return res.json();
  },

  async getFileContent(owner: string, repo: string, path: string, branch: string): Promise<string> {
    const cacheKey = `${owner}/${repo}/${branch}/${path}`;
    if (fileCache.has(cacheKey)) {
      return fileCache.get(cacheKey)!;
    }

    const res = await fetch(`/api/github/content?owner=${owner}&repo=${repo}&path=${path}&branch=${branch}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      let errorMsg = `Falha ao carregar o arquivo "${path}"`;
      try {
        const errData = await res.json();
        errorMsg = errData.error || errData.message || errorMsg;
      } catch {
        // Ignored
      }
      throw new Error(errorMsg);
    }
    
    const text = await res.text();
    fileCache.set(cacheKey, text);
    return text;
  },

  async createPullRequest(params: {
    owner: string;
    repo: string;
    baseBranch?: string;
    blueprintMarkdown?: string;
    patchContent?: string;
    apiKey?: string;
  }): Promise<{
    success: boolean;
    pullRequest: {
      id: number;
      number: number;
      html_url: string;
      title: string;
      state: string;
      branch: string;
      baseBranch: string;
      filesCount: number;
    };
  }> {
    const res = await fetch('/api/github/pull-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      let errorMsg = 'Falha ao criar Pull Request no GitHub.';
      try {
        const errData = await res.json();
        errorMsg = errData.error || errData.message || errorMsg;
      } catch {
        errorMsg += ` (${res.status} ${res.statusText})`;
      }
      throw new Error(errorMsg);
    }

    return res.json();
  },

  async getCommits(owner: string, repo: string, branch?: string): Promise<Array<{
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
  }>> {
    const branchParam = branch ? `&branch=${encodeURIComponent(branch)}` : '';
    const res = await fetch(`/api/github/commits?owner=${owner}&repo=${repo}${branchParam}`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      let errorMsg = 'Falha ao buscar histórico de commits.';
      try {
        const errData = await res.json();
        errorMsg = errData.error || errData.message || errorMsg;
      } catch {
        errorMsg += ` (${res.status} ${res.statusText})`;
      }
      throw new Error(errorMsg);
    }

    const data = await res.json();
    return data.commits || [];
  },

  async rollbackCommit(params: {
    owner: string;
    repo: string;
    branch?: string;
    targetSha: string;
    mode?: 'force_reset' | 'safe_revert';
  }): Promise<{
    success: boolean;
    mode: string;
    branch: string;
    targetSha: string;
    newCommitSha?: string;
    previousHeadSha: string;
    message: string;
    html_url?: string;
  }> {
    const res = await fetch('/api/github/rollback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      let errorMsg = 'Falha ao reverter commit no GitHub.';
      try {
        const errData = await res.json();
        errorMsg = errData.error || errData.message || errorMsg;
      } catch {
        errorMsg += ` (${res.status} ${res.statusText})`;
      }
      throw new Error(errorMsg);
    }

    return res.json();
  },

  clearCache() {
    fileCache.clear();
  }
};
