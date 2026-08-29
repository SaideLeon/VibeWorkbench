import { NextRequest, NextResponse } from 'next/server';
import { ANALYST_MODEL, FALLBACK_MODEL, getAIClient } from '@/server/gemini.service';
import { jsonError } from '@/app/api/_utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { 
      history, 
      currentInput, 
      context, 
      relevantFiles,
      repoName,
      treeOverview,
      activeFile,
      apiKey 
    } = await req.json();
    
    const ai = getAIClient(apiKey);

    // Build intelligent grounded context for the Lead Engineer
    let contextHeader = `### INFORMAÇÕES DO REPOSITÓRIO\n`;
    if (repoName) {
      contextHeader += `- **Repositório**: ${repoName}\n`;
    }
    if (activeFile) {
      contextHeader += `- **Arquivo em Foco no Editor**: \`${activeFile}\`\n`;
    }

    if (Array.isArray(treeOverview) && treeOverview.length > 0) {
      contextHeader += `\n### ESTRUTURA GERAL DE DIRETÓRIOS (Mapa do Repositório):\n\`\`\`text\n${treeOverview.slice(0, 100).join('\n')}\n\`\`\`\n`;
    }

    if (Array.isArray(relevantFiles) && relevantFiles.length > 0) {
      contextHeader += `\n### CONTEÚDO DOS ARQUIVOS CONECTADOS E CONSULTADOS (Busca Semântica):\n`;
      for (const file of relevantFiles) {
        contextHeader += `\n#### Arquivo: \`${file.path}\`\n\`\`\`\n${file.content}\n\`\`\`\n`;
      }
    } else if (context) {
      contextHeader += `\n### CONTEXTO DE CÓDIGO:\n${context}\n`;
    }

    const systemInstruction = `
      Você é um Lead Software Engineer & Arquiteto de Software sênior, com raciocínio profundo e rigor técnico.
      Você analisa repositórios de código reais com precisão cirúrgica e clareza didática.

      DIRETRIZES DE RESPOSTA:
      1. Raciocínio Profundo: Analise a arquitetura, conexões entre componentes, fluxo de dados, dependências e impacto prático da pergunta do usuário.
      2. Citação Precisa de Arquivos: Ao referenciar partes do código, cite sempre o caminho do arquivo no formato \`caminho/do/arquivo\` (ex: \`src/hooks/useAIChat.ts\`, \`app/api/route.ts\`). Explique o papel de cada arquivo na arquitetura.
      3. Seja Construtivo e Prático: Forneça snippets de código limpos e bem comentados quando sugerir melhorias ou implementações.
      4. Se o usuário sugerir uma mudança ou fizer uma pergunta complexa:
         - Destaque trade-offs, possíveis impactos em performance/segurança e sugestões de boas práticas.
         - Proponha os próximos passos ou faça perguntas de alinhamento quando necessário.
      5. Formatação: Use títulos, listas, tabelas e blocos de código com a linguagem correspondente (typescript, javascript, json, etc.).
      6. IDIOMA OBRIGATÓRIO: Responda em Português do Brasil (pt-BR) de forma elegante, fluida e altamente profissional.
    `;

    const contents = [
      { role: 'user', parts: [{ text: contextHeader }] },
      ...(history || []).map((h: any) => ({ 
        role: h.role === 'user' ? 'user' : 'model', 
        parts: [{ text: h.content }] 
      })),
      { role: 'user', parts: [{ text: currentInput }] },
    ];

    try {
      const response = await ai.models.generateContent({
        model: ANALYST_MODEL,
        contents,
        config: { 
          systemInstruction, 
          tools: [{ googleSearch: {} }] 
        },
      });
      return NextResponse.json(response);
    } catch (error: any) {
      if (error.status === 429 || error.message?.includes('429')) {
        const response = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents,
          config: { systemInstruction },
        });
        return NextResponse.json(response);
      }
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}
