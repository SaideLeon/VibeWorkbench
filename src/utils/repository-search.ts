import { FileNode } from '@/types';
import { isCodeFile } from './file-selection';

export interface ScoredFile {
  path: string;
  score: number;
  reasons: string[];
}

// Common tech / architecture synonyms to expand semantic search queries
const SEMANTIC_EXPANSIONS: Record<string, string[]> = {
  auth: ['auth', 'login', 'signup', 'register', 'jwt', 'session', 'token', 'user', 'oauth', 'credential', 'protect', 'guard'],
  autenticacao: ['auth', 'login', 'signup', 'jwt', 'session', 'token', 'user', 'oauth', 'middleware'],
  login: ['login', 'auth', 'signin', 'user', 'session', 'token'],
  seguranca: ['security', 'auth', 'audit', 'vuln', 'cve', 'sanitize', 'csrf', 'xss', 'escape', 'secret', 'token', 'protect'],
  security: ['security', 'auth', 'audit', 'vuln', 'sanitize', 'csrf', 'xss', 'permission', 'role'],
  api: ['api', 'route', 'endpoint', 'controller', 'handler', 'fetch', 'axios', 'service', 'request'],
  rotas: ['routes', 'router', 'app', 'pages', 'api', 'controller', 'handler'],
  database: ['db', 'database', 'schema', 'model', 'prisma', 'drizzle', 'sql', 'postgres', 'mongo', 'migration', 'entity', 'repository'],
  banco: ['db', 'database', 'schema', 'model', 'prisma', 'drizzle', 'sql', 'postgres', 'mongo', 'migration'],
  pagamento: ['payment', 'pay', 'checkout', 'stripe', 'paypal', 'order', 'invoice', 'billing', 'subscription'],
  payment: ['payment', 'pay', 'checkout', 'stripe', 'paypal', 'order', 'invoice', 'billing'],
  ui: ['component', 'components', 'view', 'page', 'layout', 'ui', 'button', 'modal', 'card', 'header', 'sidebar'],
  estilos: ['style', 'css', 'tailwind', 'theme', 'postcss', 'global'],
  teste: ['test', 'spec', 'jest', 'vitest', 'cypress', 'playwright', 'mock'],
  config: ['config', 'setting', 'env', 'package.json', 'tsconfig', 'vite', 'next'],
  hook: ['hook', 'hooks', 'use', 'state', 'context'],
  estado: ['store', 'redux', 'zustand', 'context', 'state', 'hook']
};

/**
 * Tokenizes natural language queries into distinct search stems and symbols
 */
export function extractSearchKeywords(query: string): string[] {
  if (!query) return [];

  // Normalize and clean punctuation
  const clean = query
    .toLowerCase()
    .replace(/[^\w\s\-_./]/g, ' ')
    .trim();

  const rawTokens = clean.split(/\s+/).filter(t => t.length >= 2);
  const keywordsSet = new Set<string>();

  for (const token of rawTokens) {
    keywordsSet.add(token);

    // Expand camelCase or snake_case if present
    const camelParts = token.split(/(?=[A-Z])|[-_./]/).filter(p => p.length >= 2);
    camelParts.forEach(p => keywordsSet.add(p.toLowerCase()));

    // Semantic synonyms expansion
    const tokenLower = token.toLowerCase();
    for (const [key, expansions] of Object.entries(SEMANTIC_EXPANSIONS)) {
      if (tokenLower.includes(key) || key.includes(tokenLower)) {
        expansions.forEach(exp => keywordsSet.add(exp));
      }
    }
  }

  return Array.from(keywordsSet);
}

/**
 * Calculates a semantic relevance score for a file path based on user query keywords
 */
export function scoreFileRelevance(
  filePath: string,
  keywords: string[],
  activeFilePath?: string,
  selectedPaths?: Set<string>
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const lowerPath = filePath.toLowerCase();
  const fileName = lowerPath.split('/').pop() || '';

  // 1. Explicitly active file in viewer gets highest priority
  if (activeFilePath && filePath === activeFilePath) {
    score += 150;
    reasons.push('Ficheiro aberto atualmente no editor');
  }

  // 2. Explicitly selected path in checkboxes
  if (selectedPaths && selectedPaths.has(filePath)) {
    score += 60;
    reasons.push('Selecionado na árvore de ficheiros');
  }

  // 3. Match against extracted keywords
  for (const kw of keywords) {
    if (fileName === kw || fileName.startsWith(`${kw}.`)) {
      score += 50;
      reasons.push(`Nome exato coincide com "${kw}"`);
    } else if (fileName.includes(kw)) {
      score += 25;
      reasons.push(`Nome contém "${kw}"`);
    } else if (lowerPath.includes(`/${kw}/`)) {
      score += 18;
      reasons.push(`Diretório coincide com "${kw}"`);
    } else if (lowerPath.includes(kw)) {
      score += 10;
      reasons.push(`Caminho contém termo "${kw}"`);
    }
  }

  // 4. Boost for core architectural files when general architecture is asked
  const isArchitectureQuery = keywords.some(k => 
    ['estrutura', 'arquitetura', 'projeto', 'overview', 'summary', 'stack', 'tecnologia', 'como funciona'].includes(k)
  );

  if (isArchitectureQuery) {
    if (fileName.includes('readme') || fileName === 'package.json') {
      score += 45;
      reasons.push('Ficheiro base de arquitetura/manifesto');
    } else if (lowerPath.includes('app') || lowerPath.includes('main') || lowerPath.includes('index') || lowerPath.includes('server')) {
      score += 30;
      reasons.push('Ponto de entrada / Core da aplicação');
    } else if (lowerPath.includes('types') || lowerPath.includes('schema')) {
      score += 20;
      reasons.push('Definições centrais de tipos/schema');
    }
  }

  // 5. Code files bonus over assets
  if (isCodeFile(filePath)) {
    score += 5;
  }

  return { score, reasons };
}

/**
 * Searches the repository tree and returns the most relevant files for a query
 */
export function findRelevantRepositoryFiles(
  allFiles: FileNode[],
  query: string,
  options?: {
    activeFilePath?: string;
    selectedPaths?: Set<string>;
    maxResults?: number;
  }
): ScoredFile[] {
  const maxResults = options?.maxResults || 6;
  const keywords = extractSearchKeywords(query);

  // Filter only code blobs
  const codeFiles = allFiles.filter(f => f.type === 'blob' && isCodeFile(f.path));

  const scoredList: ScoredFile[] = codeFiles.map(file => {
    const { score, reasons } = scoreFileRelevance(
      file.path,
      keywords,
      options?.activeFilePath,
      options?.selectedPaths
    );
    return {
      path: file.path,
      score,
      reasons
    };
  });

  // Sort descending by score
  scoredList.sort((a, b) => b.score - a.score);

  // Return top matches that have score > 0
  const topMatches = scoredList.filter(item => item.score > 0).slice(0, maxResults);

  // If no files scored (very generic question), return top entrypoints & configs
  if (topMatches.length === 0 && codeFiles.length > 0) {
    const defaultEntrypoints = codeFiles
      .filter(f => {
        const p = f.path.toLowerCase();
        return p.includes('app') || p.includes('index') || p.includes('main') || p.includes('server') || p.includes('package.json') || p.includes('readme');
      })
      .slice(0, Math.min(4, maxResults))
      .map(f => ({
        path: f.path,
        score: 10,
        reasons: ['Ponto de entrada padrão do projeto']
      }));

    return defaultEntrypoints.length > 0 ? defaultEntrypoints : codeFiles.slice(0, 3).map(f => ({
      path: f.path,
      score: 5,
      reasons: ['Amostra do repositório']
    }));
  }

  return topMatches;
}

/**
 * Finds a matching repository file path given an arbitrary path or snippet reference from AI text
 */
export function matchRepositoryFilePath(
  rawCandidate: string,
  availablePaths: Set<string> | string[]
): string | null {
  if (!rawCandidate) return null;
  const clean = rawCandidate.trim().replace(/^['"`\s(]+|['"`\s):,;.]+$/g, '');
  if (!clean || clean.length < 3) return null;

  const pathList = Array.isArray(availablePaths) ? availablePaths : Array.from(availablePaths);
  const pathSet = availablePaths instanceof Set ? availablePaths : new Set(pathList);

  // 1. Direct exact match
  if (pathSet.has(clean)) {
    return clean;
  }

  // Normalize slashes and remove leading ./ or /
  const normalizedClean = clean.replace(/^\.?\//, '').toLowerCase();

  // 2. Case-insensitive exact match
  for (const p of pathList) {
    const normP = p.replace(/^\.?\//, '').toLowerCase();
    if (normP === normalizedClean) {
      return p;
    }
  }

  // 3. Suffix match (e.g. text says "components/ai-chat/ChatInterface.tsx" or "ChatInterface.tsx" when actual path is "src/components/ai-chat/ChatInterface.tsx")
  const suffixMatches = pathList.filter(p => {
    const normP = p.replace(/^\.?\//, '').toLowerCase();
    return normP.endsWith(normalizedClean) || normP.endsWith(`/${normalizedClean}`);
  });

  if (suffixMatches.length === 1) {
    return suffixMatches[0];
  } else if (suffixMatches.length > 1) {
    // Prefer the shortest path match (closest in hierarchy)
    suffixMatches.sort((a, b) => a.length - b.length);
    return suffixMatches[0];
  }

  // 4. File extension check: if string looks like filename with known extension (e.g. `App.tsx`, `Header.tsx`)
  const filename = normalizedClean.split('/').pop() || '';
  if (filename.includes('.')) {
    const exactNameMatches = pathList.filter(p => {
      const pName = p.split('/').pop()?.toLowerCase();
      return pName === filename;
    });

    if (exactNameMatches.length === 1) {
      return exactNameMatches[0];
    } else if (exactNameMatches.length > 1) {
      exactNameMatches.sort((a, b) => a.length - b.length);
      return exactNameMatches[0];
    }
  }

  return null;
}
