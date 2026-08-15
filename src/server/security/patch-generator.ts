import { ScoredFinding } from './scoring';
import { getRuleById } from './ruleset';

export interface FileDiff {
  path: string;
  isNewFile?: boolean;
  isDeleted?: boolean;
  oldContent?: string;
  newContent: string;
  diffHunks?: string;
}

/**
 * Utilitário para formatar um cabeçalho oficial de patch do Git
 */
export function formatGitPatchHeader(params: {
  projectName: string;
  date?: string;
  authorName?: string;
  authorEmail?: string;
  findingsCount: number;
  score: number;
}): string {
  const dateStr = params.date || new Date().toUTCString();
  const author = params.authorName || 'Vibe Workbench Security Engine';
  const email = params.authorEmail || 'security@vibeworkbench.local';

  return `From 0000000000000000000000000000000000000000 Mon Sep 17 00:00:00 2001
From: ${author} <${email}>
Date: ${dateStr}
Subject: [PATCH] Fix ${params.findingsCount} security vulnerabilities (Score: ${params.score}/100)

Este patch foi gerado automaticamente pelo Vibe Workbench Security Auditor.
Aplica as correcções recomendadas no Blueprint de Segurança para o projecto:
${params.projectName}

Para aplicar este patch no seu repositório local:
  git apply security-remediation.patch
ou
  git apply --check security-remediation.patch

---
`;
}

/**
 * Normaliza e limpa a saída de um patch unificado Git
 */
export function sanitizeUnifiedDiff(rawDiff: string): string {
  let cleaned = rawDiff.trim();
  // Remove blocos de markdown ```diff ou ``` caso o LLM tenha encapsulado
  if (cleaned.startsWith('```diff')) {
    cleaned = cleaned.replace(/^```diff\r?\n/, '');
  } else if (cleaned.startsWith('```patch')) {
    cleaned = cleaned.replace(/^```patch\r?\n/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\r?\n/, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\r?\n```$/, '');
  }

  return cleaned.trim();
}
