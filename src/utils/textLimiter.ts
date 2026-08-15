export function limitTextContext(text: string, maxLines: number = 1000): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;

  const half = Math.floor(maxLines / 2);
  const head = lines.slice(0, half);
  const tail = lines.slice(-half);

  return [
    ...head,
    `\n// ... [Conteúdo truncado: O arquivo original possui ${lines.length} linhas. Exibindo as primeiras e últimas ${half} linhas para economizar contexto] ...\n`,
    ...tail
  ].join('\n');
}
