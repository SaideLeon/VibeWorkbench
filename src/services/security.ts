import { SecurityAuditResult, SecurityFinding } from '@/types';

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (body.error) return typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
  } catch {
    // ignore
  }
  return fallback;
}

export async function runSecurityAudit(
  contextFiles: { path: string; content: string }[],
  projectName?: string,
  apiKey?: string
): Promise<SecurityAuditResult> {
  const response = await fetch('/api/security/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contextFiles, projectName, apiKey }),
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
  apiKey?: string
): Promise<string> {
  const response = await fetch('/api/security/blueprint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ findings, contextFiles, projectName, apiKey }),
  });

  if (!response.ok) {
    throw new Error(`Geração do blueprint falhou: ${await readError(response, response.statusText)}`);
  }

  return response.text();
}
