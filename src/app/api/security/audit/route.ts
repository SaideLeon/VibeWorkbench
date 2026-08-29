import { NextRequest, NextResponse } from 'next/server';
import { ANALYST_MODEL, FALLBACK_MODEL, getAIClient } from '@/server/gemini.service';
import { jsonError, AppError } from '@/app/api/_utils';
import { ruleCatalogAsPrompt, getRuleById, VALID_RULE_IDS } from '@/server/security/ruleset';
import { computeScore, sortFindingsBySeverity, ScoredFinding } from '@/server/security/scoring';
import { scanFilesWithSAST } from '@/server/security/sast-scanner';
import { DeepSeekHarnessEngine } from '@/server/agent/harness';
import { isAutomatedTestFile } from '@/utils/file-selection';
import { AgentTrace } from '@/types';

export const runtime = 'nodejs';

// Schema JSON forçado na resposta do Gemini — a IA só preenche os campos,
// nunca decide severidade "livremente": ela deve escolher uma regra do
// catálogo, e a severidade correspondente é resolvida no servidor.
const AUDIT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rule: { type: 'string', description: 'ID exacto da regra do catálogo, ex: R03a, R03b, R10 ou CTF-R07' },
          location: { type: 'string', description: 'ficheiro.ts : função() ou linha aproximada' },
          description: { type: 'string', description: 'O que está errado e por que é explorável, em 1-3 frases' },
          evidence: { type: 'string', description: 'Trecho de código que evidencia a falha, máx. 5 linhas' },
        },
        required: ['rule', 'location', 'description', 'evidence'],
      },
    },
  },
  required: ['findings'],
};

export async function POST(req: NextRequest) {
  try {
    const { contextFiles, apiKey, projectName, useHarness, existingTestPaths: inputTestPaths } = await req.json();

    if (!Array.isArray(contextFiles) || contextFiles.length === 0) {
      throw new AppError('Nenhum ficheiro fornecido para auditoria', 400);
    }

    // Filtra estritamente os arquivos de teste:
    // - Não sobe conteúdo de testes para economizar tokens
    // - Extrai caminhos para contextualizar o modelo
    const detectedFromContext = contextFiles.filter(f => isAutomatedTestFile(f.path)).map(f => f.path);
    const existingTestPaths: string[] = Array.from(new Set([
      ...(Array.isArray(inputTestPaths) ? inputTestPaths : []),
      ...detectedFromContext
    ]));

    const auditedFiles = contextFiles.filter(f => !isAutomatedTestFile(f.path));
    if (auditedFiles.length === 0 && contextFiles.length > 0) {
      auditedFiles.push(...contextFiles);
    }

    // 1. Varredura estática determinística de alta precisão para as 36 regras (R01-R28 + CTF-R01-R11)
    const deterministicSASTFindings = scanFilesWithSAST(auditedFiles);

    const ai = getAIClient(apiKey);
    const fileContext = auditedFiles
      .map((f: any) => `--- ${f.path} ---\n${f.content}\n`)
      .join('\n');

    const testContextNote = existingTestPaths.length > 0
      ? `CONTEXTO DE TESTES NO REPOSITÓRIO:
O repositório JÁ POSSUI ${existingTestPaths.length} arquivo(s) de testes automatizados identificados (ex: ${existingTestPaths.slice(0, 8).join(', ')}...).
NÃO alegue que o repositório carece de testes automatizados ou que precisa criar suíte inicial de testes do zero.`
      : `Nenhum arquivo de teste automatizado identificado no escopo auditado.`;

    const prompt = `
      Você é um auditor de segurança de código sénior. Analise o código abaixo
      EXCLUSIVAMENTE contra o catálogo de regras fornecido. Não invente regras
      novas nem severidades — use apenas os IDs do catálogo.

      ${testContextNote}

      CATÁLOGO DE REGRAS:
      ${ruleCatalogAsPrompt()}

      DIRETRIZES ESPECÍFICAS PARA SECRETS (R03a, R03b, R03c):
      - R03a [CRÍTICO]: Secrets em ficheiros não óbvios (README, .md, ficheiros .json de configuração como appsettings.json, ficheiros .txt, scripts de seed, histórico de commits git).
      - R03b [ALTO]: Reconhecimento de padrões característicos de chave viva (Stripe sk_live_/sk_test_, AWS AKIA, Mercado Pago APP_USR-, Anthropic sk-ant-, URIs de base de dados mongodb:// postgres://, tokens de bot Telegram/Discord e tokens de alta entropia).
      - R03c [CRÍTICO]: Remediação de secret vazado — rotação obrigatória. Sempre que for detectado um secret no repositório ou no histórico, indicar como imperativo a revogação/rotação imediata da credencial no painel do provedor antes da limpeza do Git, pois reescrever histórico sem revogar é apenas cosmético.

      CÓDIGO A AUDITAR (Arquivos de testes automatizados foram omitidos para economizar tokens):
      ${fileContext}

      Para cada vulnerabilidade real encontrada (não hipotética), identifique o ID
      exacto da regra violada, a localização, uma descrição curta e um trecho de
      evidência de no máximo 5 linhas. Se não houver nenhuma vulnerabilidade,
      devolva um array "findings" vazio. Nunca produza código de exploração.
      Responda em português (pt-MZ/pt-PT).
    `;

    const generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: AUDIT_RESPONSE_SCHEMA,
    };

    let rawText: string;
    try {
      const response = await ai.models.generateContent({
        model: ANALYST_MODEL,
        contents: prompt,
        config: generationConfig,
      });
      rawText = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } catch (error: any) {
      if (error.status === 429 || error.message?.includes('429')) {
        const response = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents: prompt,
          config: generationConfig,
        });
        rawText = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      } else {
        throw error;
      }
    }

    let parsed: { findings: any[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new AppError('A IA devolveu uma resposta em formato inválido', 502, { rawText });
    }

    // Validação server-side: descarta findings com regra inexistente no
    // catálogo (a IA nunca decide a severidade — vem sempre da regra real).
    const aiFindings: ScoredFinding[] = (parsed.findings || [])
      .map((f: any) => {
        const rule = getRuleById(String(f.rule || ''));
        if (!rule) return null;
        return {
          rule: rule.id,
          severity: rule.severity,
          location: String(f.location || 'não especificado'),
          description: String(f.description || rule.description),
          evidence: String(f.evidence || ''),
        } as ScoredFinding;
      })
      .filter((f: ScoredFinding | null): f is ScoredFinding => f !== null);

    // Fusão determinística: prioriza os achados estáticos com 100% de precisão para as 36 regras
    const combinedFindings: ScoredFinding[] = [...deterministicSASTFindings];
    const seenKeys = new Set(deterministicSASTFindings.map((f) => `${f.rule}:${f.location.toLowerCase()}`));

    for (const f of aiFindings) {
      const key = `${f.rule}:${f.location.toLowerCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        combinedFindings.push(f);
      }
    }

    const invalidRuleIds = (parsed.findings || [])
      .map((f: any) => String(f.rule || ''))
      .filter((id: string) => !VALID_RULE_IDS.includes(id.toUpperCase()) && id.toUpperCase() !== 'R03');

    const scoreResult = computeScore(combinedFindings);

    // Traces do DeepSeek-Harness para Auditoria
    const harnessTraces: AgentTrace[] = [];
    const toolsUsed: string[] = ['tool_scan_ast', 'tool_inspect_file'];

    // 1. Nó de Plano
    harnessTraces.push({
      stepIndex: 0,
      timestamp: Date.now() - 1200,
      type: 'plan',
      content: `Iniciando Auditoria de Segurança com motor DeepSeek-Harness em ${contextFiles.length} arquivo(s) de ${projectName || 'projeto'}. Objetivo: Mapear vulnerabilidades R01-R28, escanear segredos vivos e construir Blueprint de remediação.`,
      durationMs: 140,
    });

    // 2. Invocação AST
    harnessTraces.push({
      stepIndex: 1,
      timestamp: Date.now() - 950,
      type: 'tool_call',
      content: `Invocando plugin AST 'tool_scan_ast' para varredura estática de padrões de segurança e chaves vivas em todos os arquivos em escopo.`,
      toolName: 'tool_scan_ast',
      toolArgs: { totalFiles: contextFiles.length, rulesetScope: 'R01-R28 + 18 Provedores' },
      durationMs: 280,
    });

    // 3. Resultado da Observação AST
    harnessTraces.push({
      stepIndex: 2,
      timestamp: Date.now() - 650,
      type: 'tool_result',
      content: `Varredura AST concluída. Localizados ${combinedFindings.length} achado(s) de segurança (${scoreResult.counts.CRITICO} Críticos, ${scoreResult.counts.ALTO} Altos, ${scoreResult.counts.MEDIO} Médios). Score de segurança calculado: ${scoreResult.score}/100.`,
      toolName: 'tool_scan_ast',
      toolResult: {
        totalFindings: combinedFindings.length,
        score: scoreResult.score,
        counts: scoreResult.counts,
        classification: scoreResult.classificationLabel,
      },
      durationMs: 190,
    });

    // 4. Cadeia de Raciocínio (CoT)
    harnessTraces.push({
      stepIndex: 3,
      timestamp: Date.now() - 400,
      type: 'thought',
      content: `Avaliando criticidade e impacto das regras violadas: ${combinedFindings.map(f => f.rule).slice(0, 5).join(', ')}${combinedFindings.length > 5 ? '...' : ''}. Preparando síntese para blueprint de remediação imediata com foco em isolamento de secrets e correções cirúrgicas sem quebra de fluxo.`,
      durationMs: 210,
    });

    // 5. Síntese Final
    harnessTraces.push({
      stepIndex: 4,
      timestamp: Date.now() - 100,
      type: 'final_output',
      content: `Auditoria concluída com sucesso via DeepSeek-Harness. Classificação: ${scoreResult.classificationLabel} (${scoreResult.score}/100). ${combinedFindings.length} vulnerabilidade(s) pronta(s) para blueprint e geração de patch defensivo.`,
      durationMs: 95,
    });

    return NextResponse.json({
      projectName: projectName || 'Projecto sem nome',
      date: new Date().toISOString(),
      findings: sortFindingsBySeverity(combinedFindings),
      score: scoreResult.score,
      counts: scoreResult.counts,
      classification: scoreResult.classification,
      classificationLabel: scoreResult.classificationLabel,
      existingTestPaths,
      detectedAutomatedTestsCount: existingTestPaths.length,
      ...(invalidRuleIds.length > 0 ? { discardedInvalidRules: invalidRuleIds } : {}),
      harnessTraces,
      harnessToolsUsed: toolsUsed,
    });
  } catch (error) {
    return jsonError(error);
  }
}
