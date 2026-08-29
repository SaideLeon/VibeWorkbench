import { HarnessRunResult } from '@/server/agent/types';

export interface RunAgentOptions {
  userGoal: string;
  files: { path: string; content: string }[];
  repoName?: string;
  activeFile?: string;
  treeOverview?: string[];
  apiKey?: string;
  maxIterations?: number;
  model?: 'deepseek-r1' | 'deepseek-v3' | 'gemini-3.1-pro' | 'gemini-3-flash';
}

export async function runHarnessAgent(options: RunAgentOptions): Promise<HarnessRunResult> {
  const response = await fetch('/api/agent/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorBody = await response.json();
      if (errorBody.error) {
        errorMessage = typeof errorBody.error === 'string' ? errorBody.error : JSON.stringify(errorBody.error);
      }
    } catch {
      // Ignora erro de JSON
    }
    throw new Error(`Erro no Agente DeepSeek-Harness: ${errorMessage}`);
  }

  return response.json();
}

export async function getHarnessTools() {
  const response = await fetch('/api/agent/tools');
  if (!response.ok) throw new Error('Falha ao obter ferramentas do Harness');
  return response.json();
}
