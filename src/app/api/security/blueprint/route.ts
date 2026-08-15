import { NextRequest, NextResponse } from 'next/server';
import { ANALYST_MODEL, FALLBACK_MODEL, getAIClient } from '@/server/gemini.service';
import { jsonError, AppError } from '@/app/api/_utils';
import { getRuleById } from '@/server/security/ruleset';
import { ScoredFinding } from '@/server/security/scoring';
import { renderSecurityBlueprint, FindingContent, GlobalBlueprintContent } from '@/server/security/blueprint-template';

export const runtime = 'nodejs';

const BLUEPRINT_GENERATION_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'number', description: 'Índice correspondente da vulnerabilidade (0, 1, 2...)' },
          titulo: { type: 'string', description: 'Título conciso e descritivo da vulnerabilidade e componente afectada' },
          codigoActual: { type: 'string', description: 'Trecho do código vulnerável que existe actualmente' },
          codigoActualLinguagem: { type: 'string', description: 'Linguagem do código actual (ex: typescript, sql, python)' },
          porQueExploravel: { type: 'string', description: 'Explicação detalhada de como e por que é explorável, com exemplo de execução/payload de ataque quando útil' },
          impacto: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Lista de pontos de impacto no negócio, segurança e operação'
          },
          diagrama: { 
            type: 'string', 
            description: 'Diagrama ASCII mostrando SITUAÇÃO ACTUAL (vulnerável) vs SITUAÇÃO CORRIGIDA' 
          },
          passos: {
            type: 'array',
            description: 'Passos práticos de implementação com código 100% completo, sem omissões nem placeholders',
            items: {
              type: 'object',
              properties: {
                titulo: { type: 'string', description: 'Ex: Criar nova migração 016_fix_profiles_mass_assignment.sql ou Actualizar rota src/app/api/...' },
                linguagem: { type: 'string', description: 'Linguagem do código (typescript, sql, bash, etc.)' },
                comentario: { type: 'string', description: 'Comentário inicial ou caminho do ficheiro alvo' },
                codigo: { type: 'string', description: 'Código de correcção COMPLETO e pronto para copiar e colar directamente no ficheiro' },
              },
              required: ['titulo', 'linguagem', 'codigo'],
            },
          },
          teste: {
            type: 'object',
            properties: {
              caminhoFicheiro: { type: 'string', description: 'Caminho sugerido para o ficheiro de teste (ex: src/__tests__/security/vulnerability.test.ts)' },
              comando: { type: 'string', description: 'Comando para executar o teste (ex: npx vitest run src/__tests__/security/...)' },
              linguagem: { type: 'string', description: 'Linguagem do teste (typescript, python, etc.)' },
              codigo: { type: 'string', description: 'Código completo do teste automatizado de validação' },
              resultadoEsperado: { type: 'string', description: 'Descrição clara do resultado esperado na execução do teste' },
            },
            required: ['linguagem', 'codigo', 'resultadoEsperado'],
          },
          checklist: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Checklist de verificação e deploy específico desta vulnerabilidade'
          },
          esforco: { 
            type: 'string', 
            description: 'Estimativa de esforço (ex: Baixo (< 30min), Baixo (1h), Médio (2–3h), Alto (> 4h))' 
          },
        },
        required: [
          'index',
          'titulo',
          'porQueExploravel',
          'impacto',
          'passos',
          'teste',
          'checklist',
          'esforco'
        ],
      },
    },
    checklistObrigatorio: {
      type: 'array',
      items: { type: 'string' },
      description: 'Checklist global de itens obrigatórios antes do deploy (CRÍTICO e ALTO)'
    },
    checklistRecomendado: {
      type: 'array',
      items: { type: 'string' },
      description: 'Checklist global de boas práticas recomendadas'
    },
    referencias: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          recurso: { type: 'string' },
          url: { type: 'string' },
          descricao: { type: 'string' },
        },
        required: ['recurso', 'descricao'],
      },
    },
  },
  required: ['items'],
};

export async function POST(req: NextRequest) {
  try {
    const { findings, contextFiles, projectName, apiKey } = await req.json();

    if (!Array.isArray(findings) || findings.length === 0) {
      // Nenhuma vulnerabilidade: blueprint limpo aprovado
      const md = renderSecurityBlueprint({
        projectName: projectName || 'Projecto sem nome',
        date: new Date().toISOString().split('T')[0],
        findings: [],
        contents: [],
      });
      return new NextResponse(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
    }

    const ai = getAIClient(apiKey);
    const fileContext = (contextFiles || [])
      .map((f: any) => `--- ${f.path} ---\n${f.content}\n`)
      .join('\n');

    const findingsForPrompt = (findings as ScoredFinding[]).map((f, i) => {
      const rule = getRuleById(f.rule);
      return `[VULNERABILIDADE #${i}]
Regra: ${f.rule} (${rule?.name || 'Regra de Segurança'})
Severidade: ${f.severity}
Localização: ${f.location}
Descrição da Auditoria: ${f.description}
Evidência Identificada:
${f.evidence || '(ver ficheiro indicado)'}`;
    }).join('\n\n====================\n\n');

    const prompt = `
      Você é um Arquiteto e Engenheiro de Segurança de Software Principal especializado em Application Security, DevSecOps e Remediação de Vulnerabilidades.
      
      Gere um Blueprint de Correcção de Segurança EXTREMAMENTE DETALHADO, rigoroso e 100% pronto para produção para as vulnerabilidades identificadas.
      
      ESTRUTURA E DIRETRIZES DE QUALIDADE OBRIGATÓRIAS:
      1. CÓDIGO 100% COMPLETO E PRONTO PARA COPIAR E COLAR:
         - Todo código nos passos de implementação DEVE estar totalmente escrito, funcional e pronto para substituição direta ou criação do ficheiro.
         - NUNCA use comentários de omissão como "// ... resto do código ...", "// TODO", "// adicione aqui", ou "// lógica existente". O desenvolvedor deve poder copiar o código diretamente para o arquivo sem precisar pensar ou reescrever.
         - Se for uma migração SQL, escreva a migração completa com DROP/CREATE POLICY, triggers, funções RPC SECURITY DEFINER, grants, etc.
         - Se for código TypeScript/Next.js/Node/Python, escreva todos os imports, tipagens, validações, handlers e retornos.

      2. ARQUITECTURA DA CORRECÇÃO:
         - Inclua um diagrama ASCII claro comparando:
           SITUAÇÃO ACTUAL (vulnerável): fluxo e falha
           SITUAÇÃO CORRIGIDA: fluxo protegido e validações

      3. TESTES DE VALIDAÇÃO AUTOMATIZADOS:
         - Forneça um conjunto de testes completo (ex: Vitest/Jest/Pytest) com describe/it cobrindo o cenário de ataque (que deve ser bloqueado) e o cenário legítimo (que deve passar).
         - Inclua o caminho do ficheiro de teste e o comando exato de execução no terminal.

      4. CONTEXTO E IMPACTO:
         - Explique claramente o que existe actualmente, por que é explorável (com código de exemplo do ataque/payload se aplicável) e lista de impactos reais no negócio.

      CÓDIGO-FONTE RELEVANTE AUDITADO:
      ${fileContext || '(baseie-se nas evidências e localizações fornecidas)'}

      VULNERABILIDADES AUDITADAS A CORRIGIR:
      ${findingsForPrompt}

      Responda estritamente em português (pt-MZ / pt-PT).
    `;

    const generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: BLUEPRINT_GENERATION_SCHEMA,
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

    let parsed: { 
      items: FindingContent[]; 
      checklistObrigatorio?: string[]; 
      checklistRecomendado?: string[]; 
      referencias?: { recurso: string; url?: string; descricao: string }[];
    };
    
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new AppError('A IA devolveu conteúdo em formato inválido', 502, { rawText });
    }

    const md = renderSecurityBlueprint({
      projectName: projectName || 'Projecto',
      date: new Date().toISOString().split('T')[0],
      findings: findings as ScoredFinding[],
      contents: parsed.items || [],
      globalContent: {
        checklistObrigatorio: parsed.checklistObrigatorio,
        checklistRecomendado: parsed.checklistRecomendado,
        referencias: parsed.referencias,
      },
    });

    return new NextResponse(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
  } catch (error) {
    return jsonError(error);
  }
}
