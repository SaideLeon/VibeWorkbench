import { FileNode } from '@/types';

// Non-code / binary extensions to exclude by default
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tiff', 'psd',
  'mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg', 'flac', 'aac',
  'pdf', 'zip', 'tar', 'gz', '7z', 'rar', 'bz2', 'xz',
  'exe', 'dll', 'so', 'dylib', 'bin', 'wasm', 'class', 'pyc', 'pyo', 'o', 'a',
  'ttf', 'woff', 'woff2', 'eot', 'otf',
  'lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'ds_store', 'thumbs.db'
]);

// Directories to automatically exclude on "Select All" to save tokens and avoid audit noise
const EXCLUDED_SELECT_ALL_DIRS = [
  '.github/',
  'public/',
  '.vscode/',
  '.idea/',
  '.husky/',
  'docs/',
  'documentation/',
  'node_modules/',
  '.next/',
  'dist/',
  'build/',
  'out/',
  'coverage/',
  '.turbo/',
  '.cache/',
  '.git/'
];

// Specific file names to automatically exclude on "Select All"
const EXCLUDED_SELECT_ALL_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'cargo.lock',
  'gemfile.lock',
  'composer.lock',
  'package.json',
  'metadata.json',
  'next-env.d.ts',
  '.env.example',
  '.env.template',
  '.env.sample',
  '.env.local.example',
  '.gitignore',
  '.gitattributes',
  '.editorconfig',
  '.npmrc',
  '.eslintrc',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.yaml',
  '.eslintrc.yml',
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.ts',
  'postcss.config.js',
  'postcss.config.mjs',
  'postcss.config.ts',
  'tailwind.config.js',
  'tailwind.config.mjs',
  'tailwind.config.ts',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'jsconfig.json',
  'components.json',
  'robots.txt',
  'license',
  'license.txt',
  'license.md'
]);

/**
 * Checks if a file path is likely a code / readable text file
 */
export function isCodeFile(path: string): boolean {
  const normalized = path.toLowerCase();
  const filename = normalized.split('/').pop() || '';

  // Specific text files without extension
  if (['dockerfile', 'makefile', 'license', 'readme', 'gemfile', 'procfile', 'caddyfile', '.gitignore', '.env.example', '.editorconfig'].includes(filename)) {
    return true;
  }

  // Hidden git files or binary dirs
  if (path.includes('/.git/') || path.startsWith('.git/')) {
    return false;
  }

  const parts = filename.split('.');
  if (parts.length < 2) return true; // Files without extension like 'Dockerfile', 'LICENSE' etc.
  const ext = parts.pop() || '';

  return !BINARY_EXTENSIONS.has(ext);
}

/**
 * Checks whether a file should be excluded when the user clicks "Select All" / "Todo o Projeto"
 * to save tokens, optimize latency, and focus strictly on auditable source code.
 */
export function isExcludedFromSelectAll(path: string): boolean {
  if (!path) return true;
  const normalized = path.toLowerCase().replace(/\\/g, '/');
  const filename = normalized.split('/').pop() || '';
  const isRootFile = !normalized.includes('/');

  // 1. Exclude forbidden directories (.github/, public/, .vscode/, docs/, etc.)
  for (const dir of EXCLUDED_SELECT_ALL_DIRS) {
    if (normalized.startsWith(dir) || normalized.includes(`/${dir}`)) {
      return true;
    }
  }

  // 2. Exclude known root metadata/config/lock files
  if (EXCLUDED_SELECT_ALL_FILES.has(filename)) {
    return true;
  }

  // 3. Exclude documentation and markdown files (*.md, *.markdown, *.txt) anywhere or at root
  if (filename.endsWith('.md') || filename.endsWith('.markdown') || filename.endsWith('.txt')) {
    return true;
  }

  // 4. Exclude root-level configuration files (e.g., config.*, .*rc, .*config.*)
  if (isRootFile && (filename.startsWith('.') || filename.includes('config.') || filename.endsWith('.sh'))) {
    return true;
  }

  // 5. Exclude static asset extensions
  const parts = filename.split('.');
  if (parts.length > 1) {
    const ext = parts.pop() || '';
    if (BINARY_EXTENSIONS.has(ext)) {
      return true;
    }
  }

  return false;
}

/**
 * Returns all descendant blob (file) nodes for a given folder path
 */
export function getFolderDescendantFiles(folderPath: string, files: FileNode[], onlyCode: boolean = true): FileNode[] {
  const prefix = folderPath ? (folderPath.endsWith('/') ? folderPath : folderPath + '/') : '';
  return files.filter(f => {
    if (f.type !== 'blob') return false;
    if (prefix && !f.path.startsWith(prefix) && f.path !== folderPath) return false;
    if (onlyCode && !isCodeFile(f.path)) return false;
    return true;
  });
}

/**
 * Returns all code files in the repository
 */
export function getAllCodeFiles(files: FileNode[]): FileNode[] {
  return files.filter(f => f.type === 'blob' && isCodeFile(f.path));
}

/**
 * Returns all auditable code files for "Todo o Projeto" (excluding token-heavy / non-critical configs)
 */
export function getAuditableCodeFiles(files: FileNode[]): FileNode[] {
  return files.filter(f => f.type === 'blob' && isCodeFile(f.path) && !isExcludedFromSelectAll(f.path));
}

export type FolderSelectionState = 'checked' | 'unchecked' | 'indeterminate';

/**
 * Calculates folder selection status relative to currently selected paths
 */
export function getFolderSelectionState(
  folderPath: string,
  files: FileNode[],
  selectedPaths: Set<string>
): { state: FolderSelectionState; total: number; selected: number } {
  const descendants = getFolderDescendantFiles(folderPath, files, true);
  if (descendants.length === 0) {
    return { state: 'unchecked', total: 0, selected: 0 };
  }

  let selectedCount = 0;
  for (const file of descendants) {
    if (selectedPaths.has(file.path)) {
      selectedCount++;
    }
  }

  if (selectedCount === 0) {
    return { state: 'unchecked', total: descendants.length, selected: 0 };
  }
  if (selectedCount === descendants.length) {
    return { state: 'checked', total: descendants.length, selected: selectedCount };
  }
  return { state: 'indeterminate', total: descendants.length, selected: selectedCount };
}
