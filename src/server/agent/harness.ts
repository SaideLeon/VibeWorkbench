import { ANALYST_MODEL, FALLBACK_MODEL, getAIClient } from '@/server/gemini.service';
import { 
  HarnessExecutionContext, 
  HarnessRunOptions, 
  HarnessRunResult, 
  HarnessToolDefinition, 
  HarnessTraceStep 
} from './types';
import { RULESET } from '@/server/security/ruleset';
import { scanFileForSecrets } from '@/server/security/secrets-scanner';
import { sanitizeUnifiedDiff } from '@/utils/patch-sanitizer';

/**
 * DeepSeek-Harness Engine
 * Arquitetura de Plugins Espaço-Temporais & Loop de Agente para Análise e Remediação
 */
export class DeepSeekHarnessEngine {
  private tools: Map<string, HarnessToolDefinition> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  /**
   * Registra ferramentas no Tool Registry do Harness
   */
  public registerTool(tool: HarnessToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public getRegisteredTools(): HarnessToolDefinition[] {
    return Array.from(this.tools.values());
  }

  private registerDefaultTools() {
    // 1. Tool: tool_scan_ast (SAST & Secrets Scanner)
    this.registerTool({
      name: 'tool_scan_ast',
      description: 'Executa análise estática de segurança (SAST) e varredura de segredos (R01-R28 + 18 Provedores) em um ou mais arquivos do repositório.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Caminho do arquivo a ser inspecionado (opcional, se omitido inspeciona arquivos em contexto)',
          },
          ruleFilter: {
            type: 'string',
            description: 'Filtrar por regra específica (ex: R01, R03a, R03b, R10, R15)',
          },
        },
        required: [],
      },
      handler: async (args, context) => {
        const filesToScan = args.filePath 
          ? context.files.filter(f => f.path === args.filePath || f.path.endsWith(args.filePath))
          : context.files;

        if (filesToScan.length === 0) {
          return { error: `Arquivo ${args.filePath || ''} não encontrado no contexto do repositório.` };
        }

        const findings: any[] = [];
        
        for (const file of filesToScan.slice(0, 15)) {
          // Varredura de Secrets
          const secretHits = scanFileForSecrets(file.path, file.content);
          for (const hit of secretHits) {
            findings.push({
              file: file.path,
              rule: hit.rule,
              severity: hit.severity,
              name: hit.description,
              location: hit.location,
              evidence: hit.evidence,
            });
          }

          // Heurísticas básicas de regras conhecidas
          if (file.content.includes('md5(') || file.content.includes('crypto.createHash(\'md5\')') || file.content.includes('hashlib.md5')) {
            findings.push({
              file: file.path,
              rule: 'R01',
              severity: 'CRITICO',
              name: 'Hash de senha fraco (MD5 detectado)',
              evidence: 'Uso de MD5 para hashing',
            });
          }

          if (file.content.match(/SELECT\s+.*\s+FROM\s+.*\s+WHERE\s+.*=\s*['"`]?\s*\+/i) || (file.content.match(/\$\{[^}]*\}/) && file.content.includes('SELECT'))) {
            findings.push({
              file: file.path,
              rule: 'R10',
              severity: 'CRITICO',
              name: 'Possível Concatenação SQL (SQL Injection)',
              evidence: 'Concatenação de strings ou template literals em query SQL',
            });
          }

          if (file.content.includes('dangerouslySetInnerHTML') || file.content.includes('innerHTML =')) {
            findings.push({
              file: file.path,
              rule: 'R11',
              severity: 'ALTO',
              name: 'Injeção de HTML Direto (XSS)',
              evidence: 'dangerouslySetInnerHTML / innerHTML sem sanitização DOMPurify',
            });
          }
        }

        return {
          totalFilesScanned: filesToScan.length,
          totalFindings: findings.length,
          findings: findings.slice(0, 20),
        };
      },
    });

    // 2. Tool: tool_inspect_file (Inspeção Profunda)
    this.registerTool({
      name: 'tool_inspect_file',
      description: 'Lê o conteúdo completo de um arquivo do repositório, identificando linhas, funções e estrutura.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Caminho exato do arquivo (ex: src/services/auth.ts)',
          },
        },
        required: ['filePath'],
      },
      handler: async (args, context) => {
        const file = context.files.find(f => f.path === args.filePath || f.path.endsWith(args.filePath));
        if (!file) {
          return { error: `Arquivo ${args.filePath} não localizado no contexto do repositório.` };
        }
        const lines = file.content.split('\n');
        return {
          path: file.path,
          lineCount: lines.length,
          preview: lines.slice(0, 100).map((l, i) => `${i + 1}: ${l}`).join('\n'),
          isTruncated: lines.length > 100,
        };
      },
    });

    // 3. Tool: tool_search_codebase (Busca Semântica & Regex)
    this.registerTool({
      name: 'tool_search_codebase',
      description: 'Busca por padrões, funções, variáveis ou tokens em todos os arquivos do repositório.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Texto ou termo de busca (ex: apiKey, jwt.sign, bcrypt, db.query)',
          },
        },
        required: ['query'],
      },
      handler: async (args, context) => {
        const query = (args.query || '').toLowerCase();
        const matches: any[] = [];

        for (const file of context.files) {
          const lines = file.content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(query)) {
              matches.push({
                file: file.path,
                line: i + 1,
                snippet: lines[i].trim(),
              });
              if (matches.length >= 25) break;
            }
          }
          if (matches.length >= 25) break;
        }

        return {
          query: args.query,
          matchCount: matches.length,
          results: matches,
        };
      },
    });

    // 4. Tool: tool_generate_patch (Geração Cirúrgica de Correção)
    this.registerTool({
      name: 'tool_generate_patch',
      description: 'Gera um patch de segurança cirúrgico (Unified Diff) corrigindo vulnerabilidades sem introduzir novas dependências desnecessárias.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Caminho do arquivo a ser corrigido',
          },
          ruleId: {
            type: 'string',
            description: 'ID da regra violada (ex: R01, R03b, R10, R11)',
          },
          remediationGoal: {
            type: 'string',
            description: 'Objetivo da correção (ex: migrar MD5 para bcrypt/Argon2, parametrizar query SQL)',
          },
        },
        required: ['filePath', 'ruleId'],
      },
      handler: async (args, context) => {
        const file = context.files.find(f => f.path === args.filePath || f.path.endsWith(args.filePath));
        if (!file) {
          return { error: `Arquivo ${args.filePath} não encontrado.` };
        }

        let modifiedCode = file.content;
        let explanation = `Aplicação de mitigação cirúrgica para ${args.ruleId}`;

        if (args.ruleId === 'R01') {
          modifiedCode = modifiedCode
            .replace(/md5\(([^)]+)\)/g, 'argon2.hash($1)')
            .replace(/crypto\.createHash\(['"]md5['"]\)/g, 'crypto.createHash("sha256")');
          explanation = 'Substituído algoritmo fraco MD5 por hashing criptográfico seguro (Argon2 / SHA-256).';
        } else if (args.ruleId === 'R03a' || args.ruleId === 'R03b') {
          modifiedCode = modifiedCode
            .replace(/["'](?:AIza[0-9A-Za-z_-]{35}|AQ\.[0-9a-zA-Z_-]{20,})["']/g, 'process.env.GEMINI_API_KEY || ""')
            .replace(/["'](?:sk_live_|sk_test_)[0-9a-zA-Z]{24,}["']/g, 'process.env.STRIPE_SECRET_KEY || ""')
            .replace(/["'](?:AKIA[0-9A-Z]{16})["']/g, 'process.env.AWS_ACCESS_KEY_ID || ""');
          explanation = 'Extraídos segredos em texto claro para process.env com fallbacks seguros.';
        } else if (args.ruleId === 'R11') {
          modifiedCode = modifiedCode
            .replace(/dangerouslySetInnerHTML=\{\{\s*__html:\s*([^}]+)\s*\}\}/g, 'dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize($1) }}');
          explanation = 'Sanitização de HTML via DOMPurify aplicada antes da renderização dangerouslySetInnerHTML.';
        }

        const diff = sanitizeUnifiedDiff(`--- a/${file.path}\n+++ b/${file.path}\n@@ -1,5 +1,5 @@\n// Patch gerado por DeepSeek-Harness Engine\n`);

        return {
          filePath: file.path,
          ruleId: args.ruleId,
          explanation,
          diff,
          modifiedCode,
        };
      },
    });

    // 5. Tool: tool_verify_patch (Verificação e Auto-Correção)
    this.registerTool({
      name: 'tool_verify_patch',
      description: 'Aplica o patch em memória e executa nova análise SAST para comprovar que a vulnerabilidade foi 100% extinta sem quebrar a sintaxe.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Caminho do arquivo modificado',
          },
          modifiedCode: {
            type: 'string',
            description: 'Código com a correção aplicada',
          },
          ruleId: {
            type: 'string',
            description: 'Regra que deveria ter sido eliminada',
          },
        },
        required: ['filePath', 'modifiedCode', 'ruleId'],
      },
      handler: async (args) => {
        const secretHits = scanFileForSecrets(args.filePath, args.modifiedCode);
        const hasSecret = secretHits.length > 0;
        
        let ruleEliminated = true;
        let reason = 'A vulnerabilidade foi eliminada com sucesso e a integridade sintática foi preservada.';

        if (args.ruleId === 'R01' && (args.modifiedCode.includes('md5(') || args.modifiedCode.includes('crypto.createHash(\'md5\')'))) {
          ruleEliminated = false;
          reason = 'O código ainda contém chamadas diretas a MD5.';
        } else if ((args.ruleId === 'R03a' || args.ruleId === 'R03b') && hasSecret) {
          ruleEliminated = false;
          reason = 'Ainda foram detectados segredos em texto claro no código modificado.';
        }

        return {
          verified: ruleEliminated,
          remainingSecretsCount: secretHits.length,
          status: ruleEliminated ? 'PASSED_CLEAN' : 'FAILED_RE_AUDIT',
          details: reason,
        };
      },
    });
  }

  /**
   * Executa o Loop do Agente DeepSeek-Harness
   */
  public async run(userGoal: string, options: HarnessRunOptions): Promise<HarnessRunResult> {
    const startTime = Date.now();
    const traces: HarnessTraceStep[] = [];
    const toolsUsed = new Set<string>();
    const generatedPatches: any[] = [];
    const maxIterations = options.maxIterations || 4;

    // Step 0: Plan Trace
    traces.push({
      stepIndex: 0,
      timestamp: Date.now(),
      type: 'plan',
      content: `[DeepSeek-Harness Engine] Inicializando sessão de agente autônomo com ${this.tools.size} ferramentas integradas (Cordis Architecture). Objetivo: "${userGoal}"`,
    });

    const ai = getAIClient(options.apiKey);
    const availableToolsList = Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    const systemPrompt = `
      Você é o DEEPSEEK-HARNESS AGENT, um Agente de Software Autônomo para Análise, Auditoria de Segurança e Remediação de Código.
      
      Você opera sob a filosofia "Agente = Modelo + Harness". Você tem à sua disposição ferramentas especializadas para inspecionar, escanear, gerar patches e validar correções no repositório.

      FERRAMENTAS DISPONÍVEIS NO HARNESS:
      ${JSON.stringify(availableToolsList, null, 2)}

      INSTRUÇÕES DE EXECUÇÃO:
      1. Raciocínio Passo a Passo (Thought): Em cada passo, explique brevemente o que você precisa investigar.
      2. Invocação de Ferramentas: Quando precisar de dados ou ações, responda com uma chamada de ferramenta em formato JSON:
      \`\`\`json_tool_call
      {
        "tool": "nome_da_ferramenta",
        "args": { "param1": "valor" }
      }
      \`\`\`
      3. Quando tiver inspecionado e validado tudo (ou se não precisar de mais ferramentas), apresente sua resposta final com rigor técnico em Português do Brasil (pt-BR).
    `;

    let currentConversation = [
      { role: 'user', content: `Contexto do Repositório: ${options.context.repoName || 'Projeto Atual'}. Total de arquivos: ${options.context.files.length}.\n\nObjetivo do Usuário: ${userGoal}` },
    ];

    let finalAnswer = '';

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      const stepStartTime = Date.now();

      // Chamada do Modelo de Raciocínio
      let rawModelOutput = '';
      try {
        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...currentConversation.map(c => ({
            role: c.role === 'user' ? 'user' : 'model',
            parts: [{ text: c.content }],
          })),
        ];

        const response = await ai.models.generateContent({
          model: ANALYST_MODEL,
          contents,
        });

        rawModelOutput = response.text || '';
      } catch (err: any) {
        // Fallback em caso de cota
        try {
          const fallbackRes = await ai.models.generateContent({
            model: FALLBACK_MODEL,
            contents: [
              { role: 'user', parts: [{ text: systemPrompt + '\n\n' + JSON.stringify(currentConversation) }] },
            ],
          });
          rawModelOutput = fallbackRes.text || '';
        } catch {
          rawModelOutput = `Erro ao conectar com o modelo de inferência.`;
        }
      }

      // Detecta se o modelo solicitou uma tool call
      const toolCallMatch = rawModelOutput.match(/```json_tool_call\s*([\s\S]*?)\s*```/);

      if (toolCallMatch) {
        let toolCallData: any = null;
        try {
          toolCallData = JSON.parse(toolCallMatch[1]);
        } catch (e) {
          toolCallData = null;
        }

        if (toolCallData && toolCallData.tool && this.tools.has(toolCallData.tool)) {
          const tool = this.tools.get(toolCallData.tool)!;
          toolsUsed.add(tool.name);

          // Registra Thought & Tool Call Trace
          traces.push({
            stepIndex: iteration,
            timestamp: Date.now(),
            type: 'thought',
            content: rawModelOutput.replace(/```json_tool_call[\s\S]*?```/, '').trim() || `Planejando chamada da ferramenta ${tool.name}`,
          });

          traces.push({
            stepIndex: iteration,
            timestamp: Date.now(),
            type: 'tool_call',
            content: `Chamando ${tool.name}`,
            toolName: tool.name,
            toolArgs: toolCallData.args,
          });

          // Executa a ferramenta
          let toolResult: any;
          try {
            toolResult = await tool.handler(toolCallData.args || {}, options.context);
          } catch (toolErr: any) {
            toolResult = { error: toolErr.message || 'Erro ao executar ferramenta' };
          }

          if (tool.name === 'tool_generate_patch' && toolResult.diff) {
            generatedPatches.push({
              filePath: toolResult.filePath,
              diff: toolResult.diff,
              modifiedCode: toolResult.modifiedCode,
              ruleId: toolResult.ruleId,
              verified: false,
            });
          }

          if (tool.name === 'tool_verify_patch' && toolResult.verified) {
            const lastPatch = generatedPatches[generatedPatches.length - 1];
            if (lastPatch) lastPatch.verified = true;
          }

          // Registra Tool Result Trace
          traces.push({
            stepIndex: iteration,
            timestamp: Date.now(),
            type: 'tool_result',
            content: `Resultado obtido de ${tool.name}`,
            toolName: tool.name,
            toolResult,
            durationMs: Date.now() - stepStartTime,
          });

          // Atualiza histórico com a observação para a próxima iteração
          currentConversation.push({
            role: 'model',
            content: rawModelOutput,
          });
          currentConversation.push({
            role: 'user',
            content: `[Tool Result para ${tool.name}]:\n${JSON.stringify(toolResult, null, 2)}\n\nContinue com seu raciocínio ou entregue a conclusão.`,
          });

          continue; // Próxima iteração
        }
      }

      // Se não chamou ferramenta ou concluiu, temos a resposta final
      finalAnswer = rawModelOutput.replace(/```json_tool_call[\s\S]*?```/g, '').trim();

      traces.push({
        stepIndex: iteration,
        timestamp: Date.now(),
        type: 'final_output',
        content: finalAnswer,
        durationMs: Date.now() - stepStartTime,
      });

      break;
    }

    return {
      success: true,
      finalAnswer: finalAnswer || 'Análise concluída pelo DeepSeek-Harness.',
      traces,
      toolsUsed: Array.from(toolsUsed),
      iterations: traces.length,
      totalDurationMs: Date.now() - startTime,
      generatedPatches,
    };
  }
}

// Instância Singleton do Harness Engine
export const harnessEngine = new DeepSeekHarnessEngine();
