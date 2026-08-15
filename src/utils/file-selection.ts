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
