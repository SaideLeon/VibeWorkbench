/**
 * Utilitário de sanitização e validação de sintaxe para arquivos Git Unified Diff (.patch)
 */
export function sanitizeUnifiedDiff(rawDiff: string): string {
  if (!rawDiff || typeof rawDiff !== 'string') return '';

  let cleaned = rawDiff.trim();

  // 1. Remover blocos de markdown ```diff ou ``` caso o LLM tenha encapsulado
  cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\r?\n/, '');
  cleaned = cleaned.replace(/\r?\n```$/, '');
  cleaned = cleaned.trim();

  // 2. Remover qualquer linha residual/avulsa ANTES do primeiro "diff --git" ou "--- "
  const firstDiffMatch = cleaned.search(/(?:^|\n)(?=diff --git\s+|Index:\s+|---\s+[ab\/]|---\s+\/dev\/null)/m);
  if (firstDiffMatch !== -1) {
    cleaned = cleaned.slice(firstDiffMatch).trim();
  }

  // 3. Normalizar linhas
  const lines = cleaned.split(/\r?\n/);
  const normalizedLines: string[] = [];

  let insideDiffHunk = false;
  let currentFileHasHunk = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detectar início de novo ficheiro diff
    if (line.startsWith('diff --git')) {
      insideDiffHunk = false;
      currentFileHasHunk = false;
      normalizedLines.push(line);
      continue;
    }

    // Linhas de cabeçalho do diff
    if (
      line.startsWith('new file mode') ||
      line.startsWith('deleted file mode') ||
      line.startsWith('index ') ||
      line.startsWith('similarity index') ||
      line.startsWith('rename from') ||
      line.startsWith('rename to') ||
      line.startsWith('--- ') ||
      line.startsWith('+++ ')
    ) {
      normalizedLines.push(line);
      continue;
    }

    // Linhas de hunk header (@@ -x,y +a,b @@)
    if (line.startsWith('@@')) {
      insideDiffHunk = true;
      currentFileHasHunk = true;
      normalizedLines.push(line);
      continue;
    }

    // Se estiver dentro de um hunk, garantir prefixo de diff (+, -, ou espaço para contexto)
    if (insideDiffHunk) {
      if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ') || line.startsWith('\\')) {
        normalizedLines.push(line);
      } else if (line.trim().length > 0) {
        // Se a linha não tiver prefixo mas for código dentro do hunk, adiciona prefixo '+'
        normalizedLines.push(`+${line}`);
      }
      continue;
    }

    // Se não for cabeçalho nem estiver em hunk, mas tiver formato de código após cabeçalhos
    if (line.startsWith('+') || line.startsWith('-')) {
      if (!currentFileHasHunk && normalizedLines.some(l => l.startsWith('+++ '))) {
        normalizedLines.push('@@ -0,0 +1,1 @@');
        insideDiffHunk = true;
        currentFileHasHunk = true;
      }
      normalizedLines.push(line);
    }
  }

  return normalizedLines.join('\n').trim();
}
