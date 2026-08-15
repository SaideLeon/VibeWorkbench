import { SEVERITY_WEIGHT, Severity } from './ruleset';

export interface ScoredFinding {
  rule: string;
  severity: Severity;
  location: string;
  description: string;
  evidence: string;
}

export type Classification =
  | 'APROVADO_COM_DISTINCAO'
  | 'APROVADO_COM_RESSALVAS'
  | 'APROVADO_CONDICIONALMENTE'
  | 'REPROVADO';

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  APROVADO_COM_DISTINCAO: 'Aprovado com distinção',
  APROVADO_COM_RESSALVAS: 'Aprovado com ressalvas',
  APROVADO_CONDICIONALMENTE: 'Aprovado condicionalmente',
  REPROVADO: 'Reprovado — não apto para produção',
};

export interface ScoreResult {
  score: number;
  counts: Record<Severity, number>;
  classification: Classification;
  classificationLabel: string;
}

/**
 * Cálculo de pontuação 100% determinístico — nunca delegado ao modelo de IA,
 * para garantir que o mesmo conjunto de findings produz sempre o mesmo score.
 *
 * Regras (iguais ao ruleset.md):
 *  - CRÍTICO: -25 pts, aprovação mínima exige ZERO CRÍTICO
 *  - ALTO: -10 pts, aprovação mínima >= 70 pts
 *  - MÉDIO: -5 pts, aprovação total exige >= 85 pts
 */
export function computeScore(findings: { severity: Severity }[]): ScoreResult {
  const counts: Record<Severity, number> = { CRITICO: 0, ALTO: 0, MEDIO: 0 };
  for (const f of findings) {
    if (counts[f.severity] !== undefined) counts[f.severity]++;
  }

  const deduction =
    counts.CRITICO * SEVERITY_WEIGHT.CRITICO +
    counts.ALTO * SEVERITY_WEIGHT.ALTO +
    counts.MEDIO * SEVERITY_WEIGHT.MEDIO;

  const score = Math.max(0, 100 - deduction);

  let classification: Classification;
  if (counts.CRITICO > 0 || score < 70) {
    classification = 'REPROVADO';
  } else if (score === 100) {
    classification = 'APROVADO_COM_DISTINCAO';
  } else if (score >= 85) {
    classification = 'APROVADO_COM_RESSALVAS';
  } else {
    classification = 'APROVADO_CONDICIONALMENTE';
  }

  return {
    score,
    counts,
    classification,
    classificationLabel: CLASSIFICATION_LABEL[classification],
  };
}

const SEVERITY_ORDER: Record<Severity, number> = { CRITICO: 0, ALTO: 1, MEDIO: 2 };

export function sortFindingsBySeverity<T extends { severity: Severity }>(findings: T[]): T[] {
  return [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
