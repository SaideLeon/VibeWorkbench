export type AgentRole = 'user' | 'model' | 'assistant' | 'system' | 'tool';

export interface HarnessToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      required?: boolean;
    }>;
    required: string[];
  };
  handler: (args: any, context: HarnessExecutionContext) => Promise<any>;
}

export interface HarnessTraceStep {
  stepIndex: number;
  timestamp: number;
  type: 'plan' | 'thought' | 'tool_call' | 'tool_result' | 'reflection' | 'final_output';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, any>;
  toolResult?: any;
  durationMs?: number;
}

export interface HarnessExecutionContext {
  repoName?: string;
  files: { path: string; content: string }[];
  apiKey?: string;
  activeFile?: string;
  treeOverview?: string[];
  systemInstructions?: string;
}

export interface HarnessRunOptions {
  model?: 'deepseek-r1' | 'deepseek-v3' | 'gemini-3.1-pro' | 'gemini-3-flash';
  maxIterations?: number;
  temperature?: number;
  tools?: string[];
  apiKey?: string;
  context: HarnessExecutionContext;
}

export interface HarnessRunResult {
  success: boolean;
  finalAnswer: string;
  traces: HarnessTraceStep[];
  toolsUsed: string[];
  iterations: number;
  totalDurationMs: number;
  generatedPatches?: {
    filePath: string;
    diff: string;
    originalCode?: string;
    modifiedCode?: string;
    ruleId?: string;
    verified: boolean;
  }[];
}
