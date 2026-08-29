import { ANALYST_MODEL, FALLBACK_MODEL, getAIClient } from '@/server/gemini.service';
import { AppError } from '@/app/api/_utils';
import { extractGithubErrorDetails } from '@/server/github';

export interface TargetFileProposal {
  path: string;
  isNew: boolean;
  proposedContent?: string;
}

export interface VerificationResult {
  passed: boolean;
  score: number;
  lostKeys: string[];
  originalLines: number;
  generatedLines: number;
  detectedLanguage: string;
  reason?: string;
}

export interface SurgicalProcessedFile {
  path: string;
  content: string;
  isNew: boolean;
  verification?: VerificationResult;
}

/**
 * Detecta a linguagem e o ecossistema do ficheiro a partir da extensão e cabeçalho
 */
export function detectLanguageAndEcosystem(path: string, code: string): {
  language: string;
  category: 'frontend' | 'backend' | 'database' | 'infra' | 'script' | 'config' | 'general';
} {
  const lowerPath = path.toLowerCase();
  const ext = lowerPath.split('.').pop() || '';

  if (['py'].includes(ext)) {
    return { language: 'Python', category: 'backend' };
  }
  if (['go'].includes(ext)) {
    return { language: 'Go (Golang)', category: 'backend' };
  }
  if (['rs'].includes(ext)) {
    return { language: 'Rust', category: 'backend' };
  }
  if (['java', 'kt', 'scala'].includes(ext)) {
    return { language: 'Java/JVM', category: 'backend' };
  }
  if (['cs'].includes(ext)) {
    return { language: 'C# (.NET)', category: 'backend' };
  }
  if (['php'].includes(ext)) {
    return { language: 'PHP', category: 'backend' };
  }
  if (['rb'].includes(ext)) {
    return { language: 'Ruby', category: 'backend' };
  }
  if (['c', 'cpp', 'cc', 'h', 'hpp'].includes(ext)) {
    return { language: 'C/C++', category: 'backend' };
  }
  if (['tsx', 'jsx', 'vue', 'svelte'].includes(ext)) {
    return { language: 'Frontend UI (React/Vue/Svelte)', category: 'frontend' };
  }
  if (['ts', 'js', 'mjs', 'cjs'].includes(ext)) {
    if (lowerPath.includes('route') || lowerPath.includes('api') || lowerPath.includes('server') || lowerPath.includes('controller')) {
      return { language: 'TypeScript/Node.js API', category: 'backend' };
    }
    return { language: 'TypeScript/JavaScript', category: 'general' };
  }
  if (['sql', 'prisma'].includes(ext)) {
    return { language: 'SQL / Database Schema', category: 'database' };
  }
  if (['sh', 'bash', 'zsh'].includes(ext)) {
    return { language: 'Shell Script', category: 'script' };
  }
  if (['tf', 'yaml', 'yml', 'dockerfile'].includes(ext) || lowerPath.includes('dockerfile')) {
    return { language: 'DevOps / Infrastructure / Config', category: 'infra' };
  }

  return { language: 'Código Universal', category: 'general' };
}

/**
 * CICLO 1: Localização & Descoberta de Alvos (Target Discovery)
 * Analisa o Blueprint e Patch e mapeia todos os ficheiros afetados.
 */
export async function cycle1_discoverTargets(
  blueprintMarkdown: string,
  patchContent: string,
  ai: any
): Promise<TargetFileProposal[]> {
  const prompt = `
    Você é um Arquiteto de Software e Engenheiro DevSecOps Universal (Poliglota).
    Analise o BLUEPRINT e o PATCH de segurança abaixo e extraia a lista precisa de arquivos que necessitam de intervenção, independentemente da stack tecnológica (Python, Go, Rust, Java, Node, PHP, C#, Ruby, SQL, Infraestrutura, etc.).

    Classifique cada arquivo:
    - isNew: true para arquivos que são NOVOS (ex: novas migrações SQL, novos testes de segurança, novas regras, .env.example).
    - isNew: false para arquivos que já EXISTEM no projeto e precisam de correção cirúrgica.

    Para arquivos NOVOS (isNew: true), forneça o código completo funcional em proposedContent.
    Para arquivos EXISTENTES (isNew: false), forneça uma breve descrição da alteração de segurança necessária em proposedContent.

    BLUEPRINT:
    ${blueprintMarkdown || ''}

    PATCH:
    ${patchContent || ''}
  `;

  const schema = {
    type: 'object',
    properties: {
      targets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Caminho relativo do arquivo no repositório' },
            isNew: { type: 'boolean', description: 'True se é um arquivo novo, False se já existe no repositório' },
            proposedContent: { type: 'string', description: 'Conteúdo para novo arquivo ou resumo da correção' },
          },
          required: ['path', 'isNew', 'proposedContent'],
        },
      },
    },
    required: ['targets'],
  };

  try {
    const res = await ai.models.generateContent({
      model: ANALYST_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: schema },
    });
    const raw = res.text ?? res.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.targets) ? parsed.targets : [];
  } catch (err: any) {
    if (err.status === 429 || err.message?.includes('429')) {
      const res = await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema },
      });
      const raw = res.text ?? res.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.targets) ? parsed.targets : [];
    }
    return [];
  }
}

/**
 * CICLO 2: Obtenção do Código Original Completo (Ground Truth Retrieval)
 * Descarrega 100% do código original da branch do GitHub para o ficheiro individual.
 */
export async function cycle2_fetchOriginalContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  headers: HeadersInit
): Promise<string | null> {
  try {
    const cleanPath = path.replace(/^\/+/, '').replace(/^[ab]\//, '');
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(cleanPath).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`;
    
    const res = await fetch(url, {
      headers: {
        ...headers,
        Accept: 'application/vnd.github.raw+json, application/vnd.github.v3.raw',
      },
    });

    if (res.ok) {
      return await res.text();
    }
    return null;
  } catch (err) {
    console.warn(`[Cycle 2] Não foi possível obter original para ${path}:`, err);
    return null;
  }
}

/**
 * Extrai apenas as seções do Blueprint que mencionam o arquivo alvo para economizar tokens
 */
export function extractRelevantBlueprintForFile(path: string, fullBlueprint: string): string {
  if (!fullBlueprint || fullBlueprint.length < 500) return fullBlueprint;

  const fileName = path.split('/').pop() || path;
  const sections = fullBlueprint.split(/(?=## \[SEC-)/g);
  
  const matchingSections = sections.filter(sec => 
    sec.includes(path) || sec.includes(fileName) || sec.toLowerCase().includes(fileName.toLowerCase())
  );

  if (matchingSections.length > 0) {
    return matchingSections.join('\n\n');
  }

  return fullBlueprint;
}

/**
 * Extrator Poliglota de Símbolos e Invariantes:
 * Extrai funções, classes, métodos, decorators, endpoints, structs e variáveis em QUALQUER linguagem.
 */
export function extractUniversalPreservationSymbols(code: string, language: string): string[] {
  const symbols = new Set<string>();

  // 1. Funções e Métodos Poliglotas (Python, Go, Rust, Java, C#, PHP, Ruby, JS/TS)
  // Python: def foo(, async def foo(
  // Go: func foo(, func (x *T) foo(
  // Rust: fn foo(, pub fn foo(
  // JS/TS: function foo(, const foo = (, export async function foo(
  // Java/C#/PHP: public void foo(, private function foo(
  // Ruby: def foo
  const funcMatches = code.matchAll(/(?:def|fn|func|function|public\s+(?:static\s+)?(?:async\s+)?[\w<>\[\]]+\s+|private\s+[\w<>\[\]]+\s+|protected\s+[\w<>\[\]]+\s+|const\s+|let\s+|var\s+)([a-zA-Z0-9_]{3,})\s*(?:\(|=|\s*->)/g);
  for (const m of funcMatches) {
    if (m[1] && !['if', 'for', 'while', 'switch', 'return', 'import', 'from'].includes(m[1])) {
      symbols.add(m[1]);
    }
  }

  // 2. Classes, Estruturas, Interfaces e Tipos
  // class Foo, struct Foo, interface Foo, type Foo struct, enum Foo
  const typeMatches = code.matchAll(/(?:class|struct|interface|type|trait|enum|impl)\s+([a-zA-Z0-9_]{3,})/g);
  for (const m of typeMatches) {
    if (m[1]) symbols.add(m[1]);
  }

  // 3. Rotas, Endpoints e Handlers de API (FastAPI, Flask, Gin, Express, Spring, Laravel, Rails)
  const routeMatches = code.matchAll(/(?:@(?:app|router|blueprint)\.(?:get|post|put|delete|patch)|(?:app|router)\.(?:get|post|put|delete|patch)|Route::(?:get|post)|@(?:GetMapping|PostMapping|PutMapping|DeleteMapping))\s*\(\s*['"]([^'"]+)['"]/g);
  for (const m of routeMatches) {
    if (m[1]) symbols.add(m[1]);
  }

  // 4. Se for Frontend, capturar variáveis de estado e inputs
  const stateMatches = code.matchAll(/const\s+\[([a-zA-Z0-9_]+),\s*set[a-zA-Z0-9_]+\]/g);
  for (const m of stateMatches) {
    if (m[1]) symbols.add(m[1]);
  }

  return Array.from(symbols).slice(0, 30); // Limitar a até 30 símbolos mais representativos
}

/**
 * CICLO 3 & 4: Prompt Poliglota Dual-Input & Edição Cirúrgica Universal
 */
export async function cycle4_executeSurgicalMerge(
  path: string,
  originalContent: string,
  blueprintMarkdown: string,
  ai: any,
  additionalGuidance?: string
): Promise<string> {
  const langInfo = detectLanguageAndEcosystem(path, originalContent);
  const preservationSymbols = extractUniversalPreservationSymbols(originalContent, langInfo.language);

  const prompt = `
    Você é um Engenheiro de Software Principal e Arquiteto DevSecOps especializado em código de alta performance, segurança e refatoração POLIGLOTA.

    LINGUAGEM / ECOSSISTEMA IDENTIFICADO: ${langInfo.language} (${langInfo.category})
    ARQUIVO ALVO: ${path}

    MISSÃO CRÍTICA:
    Aplicar a correção de segurança estritamente necessária no arquivo acima, PRESERVANDO 100% DE TODA A ARQUITETURA, REGRAS DE NEGÓCIO, ASSINATURAS DE MÉTODOS, CLASSES E ESTRUTURAS ORIGINAIS.

    ${preservationSymbols.length > 0 ? `SÍMBOLOS ESSENCIAIS A PRESERVAR (NÃO REMOVER NENHUM):\n- ${preservationSymbols.join('\n- ')}\n` : ''}

    DIRETRIZES DE INVARIÂNCIA UNIVERSAIS:
    1. RESPEITO ABSOLUTO À LINGUAGEM E PARADIGMA:
       - Respeite rigorosamente a sintaxe, convenções idiomáticas e tipagens da linguagem ${langInfo.language}.
       - Mantenha todas as funções, classes, decorators, middlewares, rotas, modelos de dados e tratamentos de erro existentes.
       - NUNCA assuma nem injete frameworks não utilizados no arquivo original.

    2. NÃO SIMPLIFIQUE NEM TRUNQUE CÓDIGO DE PRODUÇÃO:
       - Mantenha todo o fluxo de negócio, validações, comentários arquiteturais e chamadas de serviços auxiliares.
       - NUNCA substitua código real por esqueletos didáticos ("stubs" ou "toy examples").

    3. MODIFICAÇÃO CIRÚRGICA RESTRITA À VULNERABILIDADE:
       - Altere APENAS o trecho vulnerável apontado no Blueprint. O restante de todo o arquivo deve permanecer intocado.

    ${additionalGuidance ? `ATENÇÃO ESPECIAL DE AUTO-CORREÇÃO:\n${additionalGuidance}\n` : ''}

    CONTEÚDO ORIGINAL COMPLETO DO ARQUIVO (${path}):
    \`\`\`
    ${originalContent}
    \`\`\`

    BLUEPRINT / REQUISITO DE SEGURANÇA A APLICAR:
    ${blueprintMarkdown}

    Retorne APENAS o código completo final do arquivo atualizado e pronto para produção, sem omissões e sem placeholders (ex: proibido "// ... resto do código").
  `;

  try {
    const res = await ai.models.generateContent({
      model: ANALYST_MODEL,
      contents: prompt,
    });
    return cycle5_cleanReconstructedCode(res.text ?? res.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
  } catch (err: any) {
    if (err.status === 429 || err.message?.includes('429')) {
      const res = await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents: prompt,
      });
      return cycle5_cleanReconstructedCode(res.text ?? res.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
    }
    throw err;
  }
}

/**
 * CICLO 5: Reconstrução e Normalização de Código
 * Limpa blocos de markdown e garante integridade sintática.
 */
export function cycle5_cleanReconstructedCode(rawCode: string): string {
  let clean = rawCode.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```[a-zA-Z0-9_-]*\r?\n/, '').replace(/\r?\n```$/, '');
  }
  return clean.trim();
}

/**
 * CICLO 6: Ciclo de Auditoria & Comparação Crítica Universal (The Polyglot Critic / Self-Reflection Gate)
 * Compara o código original com o gerado em qualquer linguagem para detectar perda estrutural ou truncamento.
 */
export function cycle6_auditAndCompare(
  originalContent: string,
  candidateCode: string,
  path: string
): VerificationResult {
  const langInfo = detectLanguageAndEcosystem(path, originalContent);
  const originalLines = originalContent.split('\n').length;
  const candidateLines = candidateCode.split('\n').length;
  const originalSymbols = extractUniversalPreservationSymbols(originalContent, langInfo.language);

  const lostKeys: string[] = [];

  for (const sym of originalSymbols) {
    // Busca exata pelo identificador ou símbolo
    const regex = new RegExp(`\\b${sym}\\b`, 'i');
    if (!regex.test(candidateCode)) {
      lostKeys.push(sym);
    }
  }

  // Pontuação de preservação
  let score = 100;

  // Penalidade por símbolos/funções/classes perdidas
  if (originalSymbols.length > 0) {
    const lostRatio = lostKeys.length / originalSymbols.length;
    score -= Math.round(lostRatio * 70);
  }

  // Penalidade por redução drástica de linhas (truncamento)
  if (originalLines > 30 && candidateLines < originalLines * 0.45) {
    score -= 40;
  }

  const passed = score >= 80 && lostKeys.length === 0;

  let reason: string | undefined = undefined;
  if (!passed) {
    if (lostKeys.length > 0) {
      reason = `Símbolos essenciais da linguagem ${langInfo.language} foram removidos: [${lostKeys.join(', ')}].`;
    } else if (candidateLines < originalLines * 0.45) {
      reason = `Truncamento detectado no código (${originalLines} linhas reduzidas para ${candidateLines}).`;
    } else {
      reason = `Falha no teste de preservação estrutural (${score}/100).`;
    }
  }

  return {
    passed,
    score: Math.max(0, score),
    lostKeys,
    originalLines,
    generatedLines: candidateLines,
    detectedLanguage: langInfo.language,
    reason,
  };
}

/**
 * Executa o fluxo completo dos 7 CICLOS para remediação cirúrgica autônoma em qualquer linguagem/stack.
 */
export async function execute7CyclesSurgicalEngine(params: {
  owner: string;
  repo: string;
  baseBranch: string;
  blueprintMarkdown?: string;
  patchContent?: string;
  apiKey?: string;
  headers: HeadersInit;
}): Promise<{
  processedFiles: SurgicalProcessedFile[];
  summary: {
    totalFiles: number;
    surgicalModifications: number;
    newFiles: number;
    verifiedSafe: boolean;
  };
}> {
  const { owner, repo, baseBranch, blueprintMarkdown = '', patchContent = '', apiKey, headers } = params;
  const ai = getAIClient(apiKey);

  // CICLO 1: Descoberta de alvos
  const targets = await cycle1_discoverTargets(blueprintMarkdown, patchContent, ai);

  const processedFiles: SurgicalProcessedFile[] = [];

  for (const target of targets) {
    const cleanPath = target.path.replace(/^\/+/, '').replace(/^[ab]\//, '');
    if (cleanPath === 'SECURITY_BLUEPRINT.md') continue;

    if (target.isNew) {
      // Ficheiro novo (migração SQL, teste de segurança, etc.)
      processedFiles.push({
        path: cleanPath,
        content: target.proposedContent || '',
        isNew: true,
      });
      continue;
    }

    // CICLO 2: Obter código original do GitHub para este arquivo específico
    const originalContent = await cycle2_fetchOriginalContent(owner, repo, cleanPath, baseBranch, headers);

    if (originalContent && originalContent.trim().length > 0) {
      // Extrai apenas o trecho relevante do blueprint para este arquivo
      const targetedBlueprint = extractRelevantBlueprintForFile(cleanPath, blueprintMarkdown);

      // CICLO 3 & 4: Executar Merge Cirúrgico Poliglota
      let candidate = await cycle4_executeSurgicalMerge(cleanPath, originalContent, targetedBlueprint, ai);

      // CICLO 6: Verificação & Auditoria Crítica Poliglota
      let audit = cycle6_auditAndCompare(originalContent, candidate, cleanPath);

      // Se falhar na verificação, ativar CICLO DE AUTO-CORREÇÃO AUTÔNOMA
      if (!audit.passed) {
        console.warn(`[Critic Loop] Falha no teste de preservação para ${cleanPath} (${audit.detectedLanguage}): ${audit.reason}. Auto-corrigindo...`);
        
        const feedbackGuidance = `
          ALERTA CRÍTICO DE REJEIÇÃO PELO AGENTE AUDITOR:
          O código gerado anteriormente falhou nos seguintes pontos: ${audit.reason}
          Você DEVE manter rigorosamente todos os símbolos: [${audit.lostKeys.join(', ')}] e toda a estrutura original de ${audit.originalLines} linhas da linguagem ${audit.detectedLanguage}.
        `;

        candidate = await cycle4_executeSurgicalMerge(cleanPath, originalContent, targetedBlueprint, ai, feedbackGuidance);
        audit = cycle6_auditAndCompare(originalContent, candidate, cleanPath);
      }

      // Se mesmo após auto-correção houver perda grave de linhas (>60%), preserva o original para não corromper
      if (audit.originalLines > 50 && audit.generatedLines < audit.originalLines * 0.4) {
        console.error(`[Critic Loop] Rejeição final para evitar regressão em ${cleanPath}. O arquivo original não será corrompido.`);
        continue;
      }

      processedFiles.push({
        path: cleanPath,
        content: candidate,
        isNew: false,
        verification: audit,
      });
    } else {
      // Ficheiro não existia no branch, trata como novo
      if (target.proposedContent && target.proposedContent.length > 20) {
        processedFiles.push({
          path: cleanPath,
          content: target.proposedContent,
          isNew: true,
        });
      }
    }
  }

  // Adicionar sempre a documentação oficial de segurança
  if (blueprintMarkdown) {
    processedFiles.push({
      path: 'SECURITY_BLUEPRINT.md',
      content: blueprintMarkdown,
      isNew: true,
    });
  }

  return {
    processedFiles,
    summary: {
      totalFiles: processedFiles.length,
      surgicalModifications: processedFiles.filter(f => !f.isNew).length,
      newFiles: processedFiles.filter(f => f.isNew).length,
      verifiedSafe: processedFiles.every(f => !f.verification || f.verification.passed),
    },
  };
}
