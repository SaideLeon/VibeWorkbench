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

export interface AgentTrace {
  stepIndex: number;
  timestamp: number;
  type: 'plan' | 'thought' | 'tool_call' | 'tool_result' | 'reflection' | 'final_output';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, any>;
  toolResult?: any;
  durationMs?: number;
}

export interface AnalysisMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  isThinking?: boolean;
  relatedLinks?: { title: string; url: string }[];
  referencedFiles?: string[];
  retrievalSummary?: string;
  agentTraces?: AgentTrace[];
  toolsUsed?: string[];
  isHarnessRun?: boolean;
  generatedPatches?: {
    filePath: string;
    diff: string;
    ruleId?: string;
    verified: boolean;
  }[];
}

export type SecuritySeverity = 'CRITICO' | 'ALTO' | 'MEDIO';

export interface TerrainAxis {
  id: 'autenticacao' | 'autorizacao' | 'bancoDeDados' | 'financeiro' | 'uploads' | 'secrets';
  name: string;
  categoryName: string;
  description: string;
  exists: boolean;
  fileCount: number;
  files: { path: string; reason: string }[];
}

export interface AuditTerrainMap {
  projectName: string;
  totalFilesAnalyzed: number;
  coveredAxesCount: number;
  axes: {
    autenticacao: TerrainAxis;
    autorizacao: TerrainAxis;
    bancoDeDados: TerrainAxis;
    financeiro: TerrainAxis;
    uploads: TerrainAxis;
    secrets: TerrainAxis;
  };
  summary: string;
}

export interface TopCriticalRemediation {
  rule: string;
  name: string;
  location: string;
  action: string;
}

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
  terrainMap?: AuditTerrainMap;
  topCriticalRemediations?: TopCriticalRemediation[];
  discardedInvalidRules?: string[];
  existingTestPaths?: string[];
  detectedAutomatedTestsCount?: number;
  harnessTraces?: AgentTrace[];
  harnessToolsUsed?: string[];
  harnessPatches?: {
    filePath: string;
    diff: string;
    ruleId?: string;
    verified: boolean;
  }[];
}
