export interface FileNode {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface RepoTreeResponse {
  sha: string;
  url: string;
  tree: FileNode[];
  truncated: boolean;
  branch?: string;
}

export interface AnalysisMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  isThinking?: boolean;
  relatedLinks?: { title: string; url: string }[];
}

export type SecuritySeverity = 'CRITICO' | 'ALTO' | 'MEDIO';

export interface SecurityFinding {
  rule: string;
  severity: SecuritySeverity;
  location: string;
  description: string;
  evidence: string;
}

export interface SecurityAuditResult {
  projectName: string;
  date: string;
  findings: SecurityFinding[];
  score: number;
  counts: Record<SecuritySeverity, number>;
  classification: string;
  classificationLabel: string;
  discardedInvalidRules?: string[];
}
