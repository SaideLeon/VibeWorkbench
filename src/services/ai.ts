export interface ThinkOptions {
  relevantFiles?: { path: string; content: string }[];
  repoName?: string;
  treeOverview?: string[];
  activeFile?: string;
  apiKey?: string;
}

export async function analyzeCode(
  files: { path: string; content: string }[],
  userQuery?: string,
  apiKey?: string
) {
  const response = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contextFiles: files,
      prompt: userQuery,
      apiKey
    })
  });
  
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorBody = await response.json();
      if (errorBody.details && typeof errorBody.details === 'string') {
        errorMessage = `${errorBody.error || errorMessage} ${errorBody.details}`;
      } else if (errorBody.error) {
        errorMessage = typeof errorBody.error === 'string' ? errorBody.error : JSON.stringify(errorBody.error);
      }
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(`AI Analysis failed: ${errorMessage}`);
  }
  
  return response.json();
}

export async function thinkAndSuggest(
  history: { role: string; content: string }[],
  currentInput: string,
  context: string,
  apiKeyOrOptions?: string | ThinkOptions
) {
  let apiKey: string | undefined;
  let relevantFiles: { path: string; content: string }[] | undefined;
  let repoName: string | undefined;
  let treeOverview: string[] | undefined;
  let activeFile: string | undefined;

  if (typeof apiKeyOrOptions === 'string') {
    apiKey = apiKeyOrOptions;
  } else if (apiKeyOrOptions && typeof apiKeyOrOptions === 'object') {
    apiKey = apiKeyOrOptions.apiKey;
    relevantFiles = apiKeyOrOptions.relevantFiles;
    repoName = apiKeyOrOptions.repoName;
    treeOverview = apiKeyOrOptions.treeOverview;
    activeFile = apiKeyOrOptions.activeFile;
  }

  const response = await fetch('/api/ai/think', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      history,
      currentInput,
      context,
      relevantFiles,
      repoName,
      treeOverview,
      activeFile,
      apiKey
    })
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorBody = await response.json();
      if (errorBody.details && typeof errorBody.details === 'string') {
        errorMessage = `${errorBody.error || errorMessage} ${errorBody.details}`;
      } else if (errorBody.error) {
        errorMessage = typeof errorBody.error === 'string' ? errorBody.error : JSON.stringify(errorBody.error);
      }
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(`AI Thinking failed: ${errorMessage}`);
  }

  return response.json();
}
