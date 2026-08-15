import { NextRequest, NextResponse } from 'next/server';
import { ANALYST_MODEL, FALLBACK_MODEL, getAIClient } from '@/server/gemini.service';
import { jsonError, AppError } from '@/app/api/_utils';
import { getRuleById } from '@/server/security/ruleset';
import { ScoredFinding, computeScore } from '@/server/security/scoring';
import { formatGitPatchHeader, sanitizeUnifiedDiff } from '@/server/security/patch-generator';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { findings, contextFiles, projectName, apiKey } = await req.json();

    const scoreResult = computeScore(findings || []);
    const projName = projectName || 'project';

    if (!Array.isArray(findings) || findings.length === 0) {
      const header = formatGitPatchHeader({
        projectName: projName,
        findingsCount: 0,
        score: scoreResult.score,
      });
      const emptyPatch = `${header}\n# Nenhuma alteração necessária. O código auditado não possui vulnerabilidades.\n---\n2.44.0\n`;
      return new NextResponse(emptyPatch, {
        headers: {
          'Content-Type': 'text/x-diff; charset=utf-8',
          'Content-Disposition': `attachment; filename="security-remediation-${projName.replace(/[^a-z0-9-]+/gi, '-')}.patch"`,
        },
      });
    }

    const ai = getAIClient(apiKey);
    const fileContext = (contextFiles || [])
      .map((f: any) => `--- FILE: ${f.path} ---\n${f.content}\n`)
      .join('\n');

    const findingsDescription = (findings as ScoredFinding[]).map((f, i) => {
      const rule = getRuleById(f.rule);
      return `[VULNERABILIDADE #${i + 1}]
Regra: ${f.rule} (${rule?.name || 'Regra de Segurança'})
Severidade: ${f.severity}
Localização do Ficheiro: ${f.location}
Descrição: ${f.description}
Evidência de Código Vulnerável:
${f.evidence || '(ver ficheiro correspondente)'}`;
    }).join('\n\n====================\n\n');

    const prompt = `
      Você é um Engenheiro de Segurança de Software Principal e especialista em Git Unified Diff e DevSecOps.
      
      Gere um arquivo de PATCH UNIFICADO DO GIT (.patch) 100% válido, completo e pronto para ser aplicado diretamente no repositório com o comando "git apply".
      
      REGRAS CRÍTICAS DE FORMATO DE PATCH GIT:
      1. Use o formato padrão Git Unified Diff para cada arquivo modificado ou criado:
         Para arquivos modificados:
         diff --git a/caminho/do/ficheiro.ts b/caminho/do/ficheiro.ts
         --- a/caminho/do/ficheiro.ts
         +++ b/caminho/do/ficheiro.ts
         @@ -linha,qtd +linha,qtd @@
         -codigo_antigo_vulneravel
         +codigo_novo_seguro

         Para arquivos novos (ex: migrações SQL, proxies de API, testes, .env.example):
         diff --git a/supabase/migrations/017_security_rls_fix.sql b/supabase/migrations/017_security_rls_fix.sql
         new file mode 100644
         --- /dev/null
         +++ b/supabase/migrations/017_security_rls_fix.sql
         @@ -0,0 +1,N @@
         +-- Codigo completo da migracao
         +...

      2. O CÓDIGO DE CORRECÇÃO DEVE SER 100% COMPLETO:
         - NUNCA use comentários como "// ... restante do arquivo ..." ou "// TODO".
         - As linhas adicionadas (+) e removidas (-) devem corresponder precisamente ao código-fonte original fornecido abaixo.
         - Se uma chave de API estiver no front-end, mova-a para .env.example e crie a rota de proxy server-side em app/api/....
         - Se o RLS estiver ausente ou com "USING (true)", gere a política restritiva segura.
         - Se faltar rate limit, adicione o middleware/guardrail de rate limit.
         - Se o hash de senha for inseguro (ex: SHA256/MD5), altere para bcrypt/argon2.

      3. NÃO ENVOLVA EM MARKDOWN. DEVOLVA DIRETAMENTE O TEXTO BRUTO DO DIFF UNIFICADO DO GIT.

      PROJETO ALVO: ${projName}

      ARQUIVOS FONTE AUDITADOS:
      ${fileContext || '(baseie-se nas localizações fornecidas)'}

      VULNERABILIDADES AUDITADAS A CORRIGIR:
      ${findingsDescription}
    `;

    let rawPatch: string;
    try {
      const response = await ai.models.generateContent({
        model: ANALYST_MODEL,
        contents: prompt,
      });
      rawPatch = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } catch (error: any) {
      if (error.status === 429 || error.message?.includes('429')) {
        const response = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents: prompt,
        });
        rawPatch = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      } else {
        throw error;
      }
    }

    const cleanDiff = sanitizeUnifiedDiff(rawPatch);
    const header = formatGitPatchHeader({
      projectName: projName,
      findingsCount: findings.length,
      score: scoreResult.score,
    });

    const fullPatch = `${header}\n${cleanDiff}\n---\n2.44.0\n`;

    return new NextResponse(fullPatch, {
      headers: {
        'Content-Type': 'text/x-diff; charset=utf-8',
        'Content-Disposition': `attachment; filename="security-remediation-${projName.replace(/[^a-z0-9-]+/gi, '-')}.patch"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
