import { NextRequest, NextResponse } from 'next/server';
import { ANALYST_MODEL, FALLBACK_MODEL, getAIClient } from '@/server/gemini.service';
import { jsonError, AppError } from '@/app/api/_utils';
import { ruleCatalogAsPrompt, getRuleById, VALID_RULE_IDS } from '@/server/security/ruleset';
import { computeScore, sortFindingsBySeverity, ScoredFinding } from '@/server/security/scoring';

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
          rule: { type: 'string', description: 'ID exacto da regra do catálogo, ex: R10 ou CTF-R07' },
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
    const { contextFiles, apiKey, projectName } = await req.json();

    if (!Array.isArray(contextFiles) || contextFiles.length === 0) {
      throw new AppError('Nenhum ficheiro fornecido para auditoria', 400);
    }

    const ai = getAIClient(apiKey);
    const fileContext = contextFiles
      .map((f: any) => `--- ${f.path} ---\n${f.content}\n`)
      .join('\n');

    const prompt = `
      Você é um auditor de segurança de código sénior. Analise o código abaixo
      EXCLUSIVAMENTE contra o catálogo de regras fornecido. Não invente regras
      novas nem severidades — use apenas os IDs do catálogo.

      CATÁLOGO DE REGRAS:
      ${ruleCatalogAsPrompt()}

      CÓDIGO A AUDITAR:
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
    const findings: ScoredFinding[] = (parsed.findings || [])
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

    const invalidRuleIds = (parsed.findings || [])
      .map((f: any) => String(f.rule || ''))
      .filter((id: string) => !VALID_RULE_IDS.includes(id.toUpperCase()));

    const scoreResult = computeScore(findings);

    return NextResponse.json({
      projectName: projectName || 'Projecto sem nome',
      date: new Date().toISOString(),
      findings: sortFindingsBySeverity(findings),
      score: scoreResult.score,
      counts: scoreResult.counts,
      classification: scoreResult.classification,
      classificationLabel: scoreResult.classificationLabel,
      ...(invalidRuleIds.length > 0 ? { discardedInvalidRules: invalidRuleIds } : {}),
    });
  } catch (error) {
    return jsonError(error);
  }
}
