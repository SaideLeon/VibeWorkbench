import { SecurityAuditResult, SecurityFinding } from '@/types';

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (body.details && typeof body.details === 'string') {
      return `${body.error || fallback} ${body.details}`;
    }
    if (body.error) return typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
    if (body.message) return typeof body.message === 'string' ? body.message : JSON.stringify(body.message);
  } catch {
    // ignore
  }
  return fallback;
}

export interface StreamAuditCallbacks {
  onFileScanStart?: (data: { fileIndex: number; filePath: string; fileName: string; totalFiles: number; linesCount: number }) => void;
  onAstFinding?: (data: { rule: string; severity: string; filePath: string; location: string; description: string }) => void;
  onStatus?: (data: { phase: string; message: string }) => void;
  onAuditResult?: (result: SecurityAuditResult) => void;
  onBlueprintResult?: (blueprintMarkdown: string) => void;
}

export async function runSecurityAuditStream(
  contextFiles: { path: string; content: string }[],
  projectName?: string,
  apiKey?: string,
  useHarness: boolean = true,
  callbacks?: StreamAuditCallbacks,
  existingTestPaths?: string[]
): Promise<{ auditResult: SecurityAuditResult; blueprintMarkdown: string }> {
  const response = await fetch('/api/security/audit-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contextFiles, projectName, apiKey, useHarness, existingTestPaths }),
  });

  if (!response.ok) {
    throw new Error(`Auditoria em streaming falhou: ${await readError(response, response.statusText)}`);
  }

  if (!response.body) {
    throw new Error('Servidor não retornou stream de eventos.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalAuditResult: SecurityAuditResult | null = null;
  let finalBlueprintMarkdown: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = 'message';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('event: ')) {
        currentEvent = trimmed.slice(7).trim();
      } else if (trimmed.startsWith('data: ')) {
        const rawData = trimmed.slice(6).trim();
        try {
          const parsed = JSON.parse(rawData);

          if (currentEvent === 'file_scan_start') {
            callbacks?.onFileScanStart?.(parsed);
          } else if (currentEvent === 'ast_finding') {
            callbacks?.onAstFinding?.(parsed);
          } else if (currentEvent === 'status') {
            callbacks?.onStatus?.(parsed);
          } else if (currentEvent === 'audit_result') {
            finalAuditResult = parsed;
            callbacks?.onAuditResult?.(parsed);
          } else if (currentEvent === 'blueprint_result') {
            finalBlueprintMarkdown = parsed.blueprintMarkdown;
            callbacks?.onBlueprintResult?.(parsed.blueprintMarkdown);
          } else if (currentEvent === 'complete') {
            if (parsed.auditResult) finalAuditResult = parsed.auditResult;
            if (parsed.blueprintMarkdown) finalBlueprintMarkdown = parsed.blueprintMarkdown;
          } else if (currentEvent === 'error') {
            throw new Error(parsed.message || 'Erro durante varredura em streaming');
          }
        } catch (e: any) {
          if (currentEvent === 'error') throw e;
        }
      }
    }
  }

  if (!finalAuditResult) {
    throw new Error('A auditoria foi finalizada sem retornar o resultado estruturado.');
  }

  return {
    auditResult: finalAuditResult,
    blueprintMarkdown: finalBlueprintMarkdown || ''
  };
}

export async function runSecurityAudit(
  contextFiles: { path: string; content: string }[],
  projectName?: string,
  apiKey?: string,
  useHarness: boolean = true,
  existingTestPaths?: string[]
): Promise<SecurityAuditResult> {
  const response = await fetch('/api/security/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contextFiles, projectName, apiKey, useHarness, existingTestPaths }),
  });

  if (!response.ok) {
    throw new Error(`Auditoria de segurança falhou: ${await readError(response, response.statusText)}`);
  }

  return response.json();
}

export async function generateSecurityBlueprint(
  findings: SecurityFinding[],
  contextFiles: { path: string; content: string }[],
  projectName?: string,
  apiKey?: string,
  existingTestPaths?: string[]
): Promise<string> {
  const response = await fetch('/api/security/blueprint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ findings, contextFiles, projectName, apiKey, existingTestPaths }),
  });

  if (!response.ok) {
    throw new Error(`Geração do blueprint falhou: ${await readError(response, response.statusText)}`);
  }

  return response.text();
}

export async function generateSecurityPatch(
  blueprintMarkdown: string,
  projectName?: string,
  apiKey?: string
): Promise<string> {
  const response = await fetch('/api/security/patch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blueprintMarkdown, projectName, apiKey }),
  });

  if (!response.ok) {
    throw new Error(`Geração do arquivo .patch falhou: ${await readError(response, response.statusText)}`);
  }

  return response.text();
}

