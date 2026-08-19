import { NextRequest, NextResponse } from 'next/server';
import { ANALYST_MODEL, FALLBACK_MODEL, getAIClient } from '@/server/gemini.service';
import { jsonError } from '@/app/api/_utils';
import { formatGitPatchHeader, sanitizeUnifiedDiff } from '@/server/security/patch-generator';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { blueprintMarkdown, projectName, apiKey } = await req.json();

    const projName = projectName || 'project';

    if (!blueprintMarkdown || typeof blueprintMarkdown !== 'string' || blueprintMarkdown.trim().length === 0) {
      const header = formatGitPatchHeader({
        projectName: projName,
        findingsCount: 0,
        score: 100,
      });
      const emptyPatch = `${header}\n# Nenhuma alteração necessária. O código auditado não possui vulnerabilidades.\n---\n2.44.0\n`;
      return new NextResponse(emptyPatch, {
        headers: {
          'Content-Type': 'text/x-diff; charset=utf-8',
          'Content-Disposition': `attachment; filename="security-remediation-${projName.replace(/[^a-z0-9-]+/gi, '-')}.patch"`,
        },
      });
    }

    // Se o Blueprint indicar explicitamente que não há vulnerabilidades
    if (
      blueprintMarkdown.includes('Nenhuma vulnerabilidade encontrada') ||
      blueprintMarkdown.includes('Vulnerabilidades CRÍTICO | 0') &&
      blueprintMarkdown.includes('Vulnerabilidades ALTO | 0') &&
      blueprintMarkdown.includes('Vulnerabilidades MÉDIO | 0')
    ) {
      const header = formatGitPatchHeader({
        projectName: projName,
        findingsCount: 0,
        score: 100,
      });
      const emptyPatch = `${header}\n# Nenhuma alteração necessária. O código auditado não possui vulnerabilidades no catálogo.\n---\n2.44.0\n`;
      return new NextResponse(emptyPatch, {
        headers: {
          'Content-Type': 'text/x-diff; charset=utf-8',
          'Content-Disposition': `attachment; filename="security-remediation-${projName.replace(/[^a-z0-9-]+/gi, '-')}.patch"`,
        },
      });
    }

    const ai = getAIClient(apiKey);

    const prompt = `
      Você é um Engenheiro de Segurança de Software Principal e especialista em Git Unified Diff e DevSecOps.
      
      Converta estrita e fielmente o BLUEPRINT DE SEGURANÇA fornecido abaixo em um arquivo de PATCH UNIFICADO DO GIT (.patch) 100% válido, completo e pronto para ser aplicado diretamente no repositório com o comando "git apply".
      
      REGRAS CRÍTICAS DE FIDELIDADE AO BLUEPRINT:
      1. TOTAL CONSISTÊNCIA COM O BLUEPRINT:
         - Todo o código, caminhos de ficheiros, migrações SQL, testes unitários/integração, ficheiros .env e proteções de API DEVEM vir estritamente das resoluções já detalhadas no Blueprint.
         - Não altere a abordagem de remediação nem invente novos ficheiros além dos indicados no Blueprint.

      2. FORMATO OBRIGATÓRIO DE PATCH GIT (UNIFIED DIFF):
         - Para ficheiros modificados existentes (use o trecho "O que existe actualmente" do Blueprint para a remoção [-] e o código do passo correspondente para a adição [+]):
           diff --git a/caminho/do/ficheiro.ts b/caminho/do/ficheiro.ts
           --- a/caminho/do/ficheiro.ts
           +++ b/caminho/do/ficheiro.ts
           @@ -linha,qtd +linha,qtd @@
           -codigo_antigo_vulneravel
           +codigo_novo_seguro

         - Para novos ficheiros (ex: migrações SQL, proxies de API, testes de validação, .env.example):
           diff --git a/caminho/do/novo_ficheiro.ts b/caminho/do/novo_ficheiro.ts
           new file mode 100644
           --- /dev/null
           +++ b/caminho/do/novo_ficheiro.ts
           @@ -0,0 +1,N @@
           +-- codigo ou conteudo completo
           +...

      3. CÓDIGO 100% COMPLETO:
         - NUNCA use comentários como "// ... restante do código ..." ou "// TODO".
         - Inclua o código completo conforme o Blueprint.

      4. RETORNO BRUTO:
         - NÃO envolva em blocos markdown (\`\`\`diff). Devolva DIRETAMENTE o texto bruto do Git Unified Diff.

      PROJETO ALVO: ${projName}

      BLUEPRINT DE SEGURANÇA PREVIAMENTE GERADO:
      ${blueprintMarkdown}
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
    
    // Contagem aproximada de findings do blueprint
    const findingsMatches = blueprintMarkdown.match(/## \[SEC-/g);
    const findingsCount = findingsMatches ? findingsMatches.length : 1;

    const header = formatGitPatchHeader({
      projectName: projName,
      findingsCount,
      score: 100,
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
