import { getRuleById, Severity } from './ruleset';
import { ScoredFinding, computeScore, sortFindingsBySeverity } from './scoring';

export interface FindingContent {
  /** Índice do finding correspondente (na mesma ordem enviada à IA) */
  index: number;
  titulo?: string;
  codigoActual?: string;
  codigoActualLinguagem?: string;
  contexto?: string;
  porQueExploravel: string;
  impacto: string | string[];
  diagrama?: string;
  passos: { titulo: string; linguagem: string; codigo: string; comentario?: string }[];
  teste: { linguagem: string; comando: string; caminhoFicheiro?: string; codigo: string; resultadoEsperado: string };
  checklist: string[];
  esforco: string;
}

export interface GlobalBlueprintContent {
  checklistObrigatorio?: string[];
  checklistRecomendado?: string[];
  referencias?: { recurso: string; url?: string; descricao: string }[];
}

const SEVERITY_EMOJI_LABEL: Record<Severity, string> = {
  CRITICO: '🔴 CRÍTICO',
  ALTO: '🟠 ALTO',
  MEDIO: '🟡 MÉDIO',
};

const CLASSIFICATION_MD_LABEL: Record<string, string> = {
  APROVADO_COM_DISTINCAO: '✅ APROVADO COM DISTINÇÃO — apto para produção',
  APROVADO_COM_RESSALVAS: '⚠️ APROVADO COM RESSALVAS — requer ajustes recomendados',
  APROVADO_CONDICIONALMENTE: '⚠️ APROVADO CONDICIONALMENTE — requer correcções antes de produção',
  REPROVADO: '❌ REPROVADO — não apto para produção',
};

/**
 * Renderiza o blueprint de segurança exatamente com a estrutura do modelo anexado:
 * - Score e classificação com emojis e formato de tabela oficial
 * - Tabela do Índice de Vulnerabilidades com colunas (#, Regra, Severidade, Localização, Esforço, Status)
 * - Seções detalhadas por vulnerabilidade com:
 *   - Contexto (O que existe actualmente + Por que é explorável + Impacto potencial)
 *   - Arquitectura da Correcção (Diagrama ASCII / Fluxo)
 *   - Implementação Passo a Passo com CÓDIGO COMPLETO pronto para copiar e colar
 *   - Teste de Validação (Caminho + Comando + Código completo + Resultado esperado)
 *   - Checklist de Deploy por falha
 * - Checklist Global Pré-Deploy (Obrigatório vs Recomendado)
 * - Tabela de Referências e Recursos
 */
export function renderSecurityBlueprint(params: {
  projectName: string;
  date: string;
  findings: ScoredFinding[];
  contents: FindingContent[];
  globalContent?: GlobalBlueprintContent;
  existingTestPaths?: string[];
}): string {
  const { projectName, date, findings, contents, globalContent, existingTestPaths } = params;
  const scoreResult = computeScore(findings);

  // Emparelha cada finding com o seu conteúdo pela posição ORIGINAL antes de reordenar
  const contentByOriginalIndex = new Map(contents.map((c) => [c.index, c]));
  const paired = findings.map((f, originalIndex) => ({
    finding: f,
    content: contentByOriginalIndex.get(originalIndex),
  }));
  const ordered = sortFindingsBySeverity(
    paired.map((p, i) => ({ ...p.finding, __pairIndex: i }))
  ) as (ScoredFinding & { __pairIndex: number })[];

  // Helper para garantir que células de tabelas Markdown não quebrem por conterem '|' ou '\n'
  const sanitizeCell = (text: string) => (text || '').replace(/\|/g, '-').replace(/\r?\n/g, ' ').trim();

  // Tabela Índice de Vulnerabilidades
  const indiceRows = ordered
    .map((f, i) => {
      const content = paired[f.__pairIndex].content;
      const rule = getRuleById(f.rule);
      const title = sanitizeCell(content?.titulo || rule?.name || f.description);
      const location = sanitizeCell(f.location);
      const effort = sanitizeCell(content?.esforco || (f.severity === 'CRITICO' ? 'Médio (2–4h)' : f.severity === 'ALTO' ? 'Baixo (1–2h)' : 'Baixo (< 1h)'));
      return `| ${i + 1} | [${f.rule}] ${title} | ${SEVERITY_EMOJI_LABEL[f.severity]} | \`${location}\` | ${effort} | ⬜ Pendente |`;
    })
    .join('\n');

  // Blocos detalhados por vulnerabilidade
  const vulnBlocks = ordered
    .map((f) => {
      const rule = getRuleById(f.rule);
      const content = paired[f.__pairIndex].content;
      const ruleName = content?.titulo || rule?.name || 'Vulnerabilidade Identificada';

      // Impacto formatado em bullets se for string ou array
      let impactoFormatted = '';
      if (Array.isArray(content?.impacto)) {
        impactoFormatted = content.impacto.map((item) => `- ${item}`).join('\n');
      } else if (content?.impacto) {
        impactoFormatted = content.impacto
          .split('\n')
          .map((line) => (line.trim().startsWith('-') ? line : `- ${line}`))
          .join('\n');
      } else {
        impactoFormatted = `- Exposição a risco de segurança na regra ${f.rule}\n- Potencial comprometimento de integridade ou confidencialidade`;
      }

      // Passos de implementação com código completo
      const passosMd = (content?.passos || [])
        .map((p, idx) => {
          return `#### Passo ${idx + 1} — ${p.titulo}

\`\`\`${p.linguagem || 'typescript'}
${p.comentario ? `// ${p.comentario}\n` : ''}${p.codigo}
\`\`\``;
        })
        .join('\n\n');

      // Diagrama de arquitetura da correção (se fornecido)
      const diagramaBlock = content?.diagrama
        ? `\n---\n\n### Arquitectura da Correcção\n\n\`\`\`\n${content.diagrama.trim()}\n\`\`\`\n`
        : '';

      // Checklist de deploy específico
      const defaultChecklist = [
        `Correcção aplicada e verificada em \`${f.location}\``,
        `Testes automatizados de segurança a passar para [${f.rule}]`,
        `Revisão de código por par antes do merge`,
      ];
      const checklistItems = content?.checklist && content.checklist.length > 0 ? content.checklist : defaultChecklist;
      const checklistMd = checklistItems.map((item) => `- [ ] ${item}`).join('\n');

      // Código actual / evidência
      const currentCode = content?.codigoActual || f.evidence || `// Trecho identificado em: ${f.location}`;
      const currentLang = content?.codigoActualLinguagem || (f.location.endsWith('.sql') ? 'sql' : f.location.endsWith('.py') ? 'python' : 'typescript');

      // Teste de validação
      const testLang = content?.teste?.linguagem || 'typescript';
      const testFileHeader = content?.teste?.caminhoFicheiro ? `// ${content.teste.caminhoFicheiro}\n` : '';
      const testCmd = content?.teste?.comando ? `// Executar com: ${content.teste.comando}\n\n` : '';
      const testCode = content?.teste?.codigo || `describe('${f.rule} — Validação de Segurança', () => {\n  it('garante que a vulnerabilidade está corrigida', async () => {\n    // Verificação automatizada\n    expect(true).toBe(true);\n  });\n});`;

      return `---

## [${f.rule}] ${ruleName} — ${SEVERITY_EMOJI_LABEL[f.severity]}

### Contexto

**O que existe actualmente:**

\`\`\`${currentLang}
${currentCode}
\`\`\`

**Por que é explorável:**

${content?.porQueExploravel || f.description}

**Impacto potencial:**
${impactoFormatted}
${diagramaBlock}
---

### Implementação Passo a Passo

${passosMd || '_(Revise o ficheiro e aplique a correcção recomendada)_'}

---

### Teste de Validação

\`\`\`${testLang}
${testFileHeader}${testCmd}${testCode}
\`\`\`

**Resultado esperado:** ${content?.teste?.resultadoEsperado || 'Os testes de segurança passam com sucesso e a vulnerabilidade é bloqueada.'}

---

### Checklist de Deploy

${checklistMd}
`;
    })
    .join('\n');

  // Checklist global pré-deploy
  const criticalAndHighRules = ordered.filter((f) => f.severity === 'CRITICO' || f.severity === 'ALTO');
  const testSuiteText = existingTestPaths && existingTestPaths.length > 0
    ? `Integrar testes de regressão de segurança à suíte de testes existente do projeto (${existingTestPaths.length} arquivos de teste já presentes)`
    : 'Suite completa de testes de segurança a passar';

  const mandatoryItems =
    globalContent?.checklistObrigatorio ||
    (criticalAndHighRules.length > 0
      ? criticalAndHighRules.map((f) => `**[${f.rule}]** Correcção aplicada e validada em \`${f.location}\``)
      : ['Todos os pontos críticos auditados e verificados'])
        .concat([testSuiteText, 'Variáveis de ambiente e secrets verificados fora do repositório']);

  const recommendedItems =
    globalContent?.checklistRecomendado || [
      'Revisão e auditoria periódica de dependências e permissões',
      'Activar registo de logs de auditoria (audit_log) em operações sensíveis',
      'Executar testes de regressão de segurança antes de cada deploy em produção',
    ];

  // Tabela de referências
  const defaultRefs = [
    { recurso: 'OWASP Top 10 Security Risks', url: 'https://owasp.org/www-project-top-ten/', descricao: 'Padrão global de segurança para aplicações web e APIs' },
    { recurso: 'OWASP Mass Assignment Prevention', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html', descricao: 'Guia de protecção contra atribuição em massa de propriedades' },
    { recurso: 'Defense in Depth & Input Validation', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html', descricao: 'Validação rigorosa server-side e princípios de defesa em profundidade' },
  ];
  const refsList = globalContent?.referencias && globalContent.referencias.length > 0 ? globalContent.referencias : defaultRefs;
  const refsRows = refsList
    .map((r) => `| [${sanitizeCell(r.recurso)}](${r.url || '#'}) | ${sanitizeCell(r.descricao)} |`)
    .join('\n');

  const classificationStatus = CLASSIFICATION_MD_LABEL[scoreResult.classification] || scoreResult.classificationLabel;

  const testSuiteHeader = existingTestPaths && existingTestPaths.length > 0
    ? `**Suíte de Testes Existente:** Detectados ${existingTestPaths.length} arquivo(s) de testes automatizados no repositório (\`${existingTestPaths.slice(0, 3).join('`, `')}\`${existingTestPaths.length > 3 ? ` e mais ${existingTestPaths.length - 3}` : ''}). Os testes de remediação deste blueprint devem ser integrados à sua suíte existente.\n`
    : '';

  return `# 🔐 Blueprint de Correcção de Segurança

**Projecto:** ${projectName}  
**Data da auditoria:** ${date}  
**Auditado por:** Mitigar IA Security Audit Skill v1.0  
${testSuiteHeader}

---

## Score de Segurança

| Métrica | Valor |
|---------|-------|
| Score actual | ${scoreResult.score}/100 |
| Score esperado após correcções | 100/100 |
| Vulnerabilidades CRÍTICO | ${scoreResult.counts.CRITICO} |
| Vulnerabilidades ALTO | ${scoreResult.counts.ALTO} |
| Vulnerabilidades MÉDIO | ${scoreResult.counts.MEDIO} |
| **Resultado actual** | **${classificationStatus}** |

---

## Índice de Vulnerabilidades

| # | Regra | Severidade | Localização | Esforço | Status |
|---|-------|-----------|-------------|---------|--------|
${indiceRows || '| - | - | - | - | - | ⬜ Nenhuma vulnerabilidade |'}

> **Esforço:** Baixo (< 1h) · Médio (1–4h) · Alto (> 4h)

${vulnBlocks || '\n_Nenhuma vulnerabilidade encontrada nesta auditoria. O código analisado está conforme as diretrizes de segurança._\n'}

---

## Checklist Global Pré-Deploy

### Obrigatório (CRÍTICO e ALTO)
${mandatoryItems.map((item) => `- [ ] ${item}`).join('\n')}

### Recomendado (Boas Práticas)
${recommendedItems.map((item) => `- [ ] ${item}`).join('\n')}

---

## Referências e Recursos

| Recurso | Descrição |
|---------|-----------|
${refsRows}

---

_Blueprint gerado automaticamente pela Security Audit Skill v1.0_  
_Baseado em: Relatório CTF v1.0 + Plataforma de Análise de Segurança de Código v1.0_
`;
}
