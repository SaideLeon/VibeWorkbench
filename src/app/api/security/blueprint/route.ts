import { NextRequest, NextResponse } from 'next/server';
import { ANALYST_MODEL, FALLBACK_MODEL, getAIClient } from '@/server/gemini.service';
import { jsonError, AppError } from '@/app/api/_utils';
import { getRuleById } from '@/server/security/ruleset';
import { ScoredFinding } from '@/server/security/scoring';
import { renderSecurityBlueprint, FindingContent, GlobalBlueprintContent } from '@/server/security/blueprint-template';
import { ensureCompleteBlueprintItems } from '@/server/security/remediation-builder';
import { isAutomatedTestFile } from '@/utils/file-selection';
import { prepareAuditTerrain } from '@/server/security/ground-preparation';

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
    const { findings, contextFiles, projectName, apiKey, existingTestPaths: inputTestPaths } = await req.json();

    const detectedFromContext = (contextFiles || []).filter((f: any) => isAutomatedTestFile(f.path)).map((f: any) => f.path);
    const existingTestPaths: string[] = Array.from(new Set([
      ...(Array.isArray(inputTestPaths) ? inputTestPaths : []),
      ...detectedFromContext
    ]));

    const auditedFiles = (contextFiles || []).filter((f: any) => !isAutomatedTestFile(f.path));
    const terrainMap = prepareAuditTerrain(auditedFiles.length > 0 ? auditedFiles : (contextFiles || []), projectName);

    if (!Array.isArray(findings) || findings.length === 0) {
      // Nenhuma vulnerabilidade: blueprint limpo aprovado
      const md = renderSecurityBlueprint({
        projectName: projectName || 'Projecto sem nome',
        date: new Date().toISOString().split('T')[0],
        findings: [],
        contents: [],
        existingTestPaths,
        terrainMap,
      });
      return new NextResponse(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
    }

    const ai = getAIClient(apiKey);
    const fileContext = auditedFiles
      .map((f: any) => `--- ${f.path} ---\n${f.content}\n`)
      .join('\n');

    const findingsForPrompt = (findings as ScoredFinding[]).map((f, i) => {
      const rule = getRuleById(f.rule);
      return `[VULNERABILIDADE #${i + 1}]
Vulnerabilidade: ${rule?.name || 'Falha de Segurança'}
Severidade: ${f.severity}
Localização: ${f.location}
Descrição da Auditoria: ${f.description}
Evidência Identificada:
${f.evidence || '(ver ficheiro indicado)'}`;
    }).join('\n\n====================\n\n');

    const testContextDirective = existingTestPaths.length > 0
      ? `CONTEXTO SOBRE TESTES EXISTENTES NO REPOSITÓRIO:
O repositório JÁ POSSUI ${existingTestPaths.length} arquivo(s) de testes automatizados detectados (ex: ${existingTestPaths.slice(0, 8).join(', ')}...).
- NÃO declare que o projeto carece de testes automatizados ou que precisa criar suíte básica do zero.
- Os testes fornecidos na seção "teste" de cada vulnerabilidade devem ser testes de regressão de segurança específicos para serem adicionados à suíte existente.`
      : '';

    const prompt = `
      Você é um Arquiteto de Segurança de Software Principal e Especialista em AppSec.
      
      Gere um Blueprint de Correcção de Segurança CIRÚRGICO, PRECISO, EFICIENTE e 100% pronto para produção para as vulnerabilidades identificadas.
      
      ${testContextDirective}

      DIRETRIZES FUNDAMENTAIS DE ESCOPO CIRÚRGICO (ANTI-SOBRECARGA / SEM DESPERDÍCIO DE MEMÓRIA):
      1. CÓDIGO CIRÚRGICO DA FUNÇÃO OU BLOCO ESPECÍFICO (NUNCA O ARQUIVO COMPLETO):
         - Em "codigoActual": Mostre APENAS o trecho/função específico que contém a vulnerabilidade (5 a 25 linhas), com comentários pontuais indicando onde está o risco. NUNCA coloque páginas inteiras ou arquivos com centenas de linhas.
         - Em "passos": Cada passo deve conter APENAS a função, método, RPC, SQL migration ou middleware específico corrigido (10 a 40 linhas).
         - Se o problema estiver numa página/componente frontend (ex: 'app/cadastro/page.tsx', 'components/Form.tsx'), NÃO reescreva o arquivo page.tsx todo com imports, JSX e formulário inteiro! Mostre apenas o bloco do handler de erro, a função de validação ou a chamada corrigida.
         - Se for uma migration SQL ou RPC de banco de dados (ex: 'supabase/19_register_payment_price_lock.sql'), mostre a função SQL / CREATE POLICY / CHECK constraint completa e autocontida.
         - Se for um arquivo de utilitário (ex: 'lib/supabase.ts'), mostre apenas a função corrigida (ex: 'uploadProductImage') e eventuais helpers de apoio necessários (ex: 'validateImageMagicBytes').
         - O código fornecido em cada passo deve ser 100% funcional, sem omissões internas desnecessárias.

      2. ARQUITECTURA DA CORRECÇÃO:
         - Inclua um diagrama ASCII conciso (4 a 8 linhas) comparando:
           SITUAÇÃO ACTUAL (vulnerável): fluxo e falha
           SITUAÇÃO CORRIGIDA: fluxo protegido e validações

      3. TESTES DE VALIDAÇÃO AUTOMATIZADOS:
         - Forneça um teste de regressão focado e executável (Playwright, Vitest, Jest ou SQL) com 15 a 30 linhas cobrindo o bloqueio do ataque e a execução legítima.
         - Inclua o caminho do ficheiro de teste e o comando exato de execução no terminal.

      4. CONTEXTO E VETOR DE EXPLORAÇÃO:
         - Explique com clareza cristalina e riqueza de detalhes técnicos A FALHA e EXATAMENTE COMO O INVASOR PODE HACKEAR OU EXPLORAR O CÓDIGO (cenário de ataque, chamadas maliciosas, payloads, bypass de controles) e o impacto operacional e comercial real.

      5. PROTEÇÃO DE ENGENHARIA E REGRAS INTERNAS (ANTI-DESTILAÇÃO):
         - NUNCA mencione códigos internos de regras (como R01-R28, CTF-R01, etc.), catálogo de regras de negócio ou heurísticas de análise. Use títulos técnicos objetivos para a falha (ex: "Injeção de SQL na Consulta de Usuário").
         - NÃO cite metodologias proprietárias, e-books ou regras do motor. Concentre-se 100% na entrega prática da solução para o código vulnerável.

      6. REMEDIAÇÃO DE SECRETS E ROTAÇÃO OBRIGATÓRIA:
         - Para qualquer secret ou credencial exposta, o Blueprint DEVE prescrever os 3 passos de remediação estrita:
           (1) Revogação/Rotação imediata da credencial directamente no painel do provedor (Stripe, AWS IAM, etc.);
           (2) Substituição por placeholder inequívoco no .env.example;
           (3) Teste de validação ou limpeza de histórico após a rotação.

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
      parsed = { items: [] };
    }

    const verifiedContents = ensureCompleteBlueprintItems(
      parsed.items || [],
      findings as ScoredFinding[],
      auditedFiles
    );

    const md = renderSecurityBlueprint({
      projectName: projectName || 'Projecto',
      date: new Date().toISOString().split('T')[0],
      findings: findings as ScoredFinding[],
      contents: verifiedContents,
      existingTestPaths,
      terrainMap,
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
