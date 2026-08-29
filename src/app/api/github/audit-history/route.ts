import { NextRequest, NextResponse } from 'next/server';
import { AppError, jsonError } from '@/app/api/_utils';
import { getGithubHeaders, extractGithubErrorDetails } from '@/server/github';
import { PROVIDER_PATTERNS, isNonObviousSecretLocation, maskSecretValue } from '@/server/security/secrets-scanner';
import { getRuleById } from '@/server/security/ruleset';

export const runtime = 'nodejs';

export interface GitCommitSecretLeak {
  commitSha: string;
  commitShortSha: string;
  commitMessage: string;
  author: {
    name: string;
    date: string | null;
  };
  filePath: string;
  fileType: string;
  isNonObvious: boolean;
  provider: string;
  patternName: string;
  ruleId: string;
  severity: string;
  maskedSecret: string;
  rawSecret: string;
  rawSecretPreview: string;
  lineSnippet: string;
  lineNumber?: number;
  changeType: 'added' | 'modified';
  patchHunkHeader?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const branch = searchParams.get('branch');
    const maxCommitsParam = searchParams.get('maxCommits');
    const maxCommits = Math.min(Math.max(parseInt(maxCommitsParam || '50', 10), 5), 100);

    if (!owner || !repo) {
      throw new AppError('Parâmetros "owner" e "repo" são obrigatórios.', 400);
    }

    const headers = getGithubHeaders(req);
    const branchQuery = branch ? `&sha=${encodeURIComponent(branch)}` : '';
    const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${maxCommits}${branchQuery}`;

    const commitsRes = await fetch(commitsUrl, { headers });

    if (!commitsRes.ok) {
      if (commitsRes.status === 404) {
        throw new AppError(`Repositório ${owner}/${repo} não encontrado ou sem permissão de acesso.`, 404);
      }
      if (commitsRes.status === 401) {
        throw new AppError('Token do GitHub inválido ou expirado.', 401);
      }
      if (commitsRes.status === 403) {
        throw new AppError('Limite de requisições excedido. Adicione um GitHub Token nas configurações.', 403);
      }
      throw new AppError('Falha ao listar commits do repositório.', commitsRes.status, await extractGithubErrorDetails(commitsRes));
    }

    const commitList: any[] = await commitsRes.json();
    if (!Array.isArray(commitList) || commitList.length === 0) {
      return NextResponse.json({
        success: true,
        scannedCommitsCount: 0,
        leaks: [],
        summary: { totalLeaks: 0, providers: {}, nonObviousCount: 0 },
        message: 'Nenhum commit encontrado no repositório.',
      });
    }

    const leaks: GitCommitSecretLeak[] = [];
    const seenSecretCommit = new Set<string>();

    // Processar commits em lotes concorrentes controlados (lotes de 5) para performance sem estourar rate-limit
    const BATCH_SIZE = 5;
    for (let i = 0; i < commitList.length; i += BATCH_SIZE) {
      const batch = commitList.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (commitSummary: any) => {
          const sha = commitSummary.sha;
          if (!sha) return;

          try {
            const singleCommitUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`;
            const singleRes = await fetch(singleCommitUrl, { headers });
            if (!singleRes.ok) return;

            const commitDetail = await singleRes.json();
            const commitMessage = commitDetail.commit?.message || '';
            const author = {
              name: commitDetail.commit?.author?.name || commitDetail.author?.login || 'Autor desconhecido',
              date: commitDetail.commit?.author?.date || null,
            };
            const files: any[] = commitDetail.files || [];

            for (const file of files) {
              const filePath = file.filename || '';
              const patch = file.patch || '';
              if (!patch) continue;

              const { isNonObvious, fileType } = isNonObviousSecretLocation(filePath);
              const patchLines = patch.split('\n');

              let currentLineInFile = 0;
              let currentHunk = '';

              for (let lineIdx = 0; lineIdx < patchLines.length; lineIdx++) {
                const line = patchLines[lineIdx];

                // Detectar cabeçalho de hunk @@ -12,4 +12,8 @@
                if (line.startsWith('@@')) {
                  currentHunk = line;
                  const matchHunk = line.match(/\+([0-9]+)/);
                  if (matchHunk) {
                    currentLineInFile = parseInt(matchHunk[1], 10) - 1;
                  }
                  continue;
                }

                // Linhas adicionadas (+) no commit
                const isAddition = line.startsWith('+') && !line.startsWith('+++');
                if (isAddition) {
                  currentLineInFile++;
                  const cleanLine = line.substring(1);

                  // Pular linhas de exemplo/placeholders óbvios
                  if (
                    cleanLine.includes('your_api_key_here') ||
                    cleanLine.includes('sk_test_xxx') ||
                    cleanLine.includes('AKIAIOSFODNN7EXAMPLE') ||
                    cleanLine.includes('CHANGE_ME')
                  ) {
                    continue;
                  }

                  // 1. Verificar contra padrões de provedores (R03b / R03a)
                  for (const pattern of PROVIDER_PATTERNS) {
                    pattern.regex.lastIndex = 0;
                    const matches = Array.from(cleanLine.matchAll(pattern.regex)) as RegExpMatchArray[];

                    for (const m of matches) {
                      const rawSecret = m[0];
                      if (!rawSecret) continue;

                      const dedupeKey = `${sha}:${filePath}:${rawSecret}`;
                      if (seenSecretCommit.has(dedupeKey)) continue;
                      seenSecretCommit.add(dedupeKey);

                      const ruleId = isNonObvious ? 'R03a' : pattern.ruleId;
                      const rule = getRuleById(ruleId);
                      const maskedSecret = maskSecretValue(rawSecret);

                      leaks.push({
                        commitSha: sha,
                        commitShortSha: sha.substring(0, 7),
                        commitMessage,
                        author,
                        filePath,
                        fileType,
                        isNonObvious,
                        provider: pattern.provider,
                        patternName: pattern.name,
                        ruleId,
                        severity: rule ? rule.severity : 'CRITICO',
                        maskedSecret,
                        rawSecret,
                        rawSecretPreview: maskedSecret,
                        lineSnippet: cleanLine.replace(rawSecret, maskedSecret).trim(),
                        lineNumber: currentLineInFile > 0 ? currentLineInFile : undefined,
                        changeType: 'added',
                        patchHunkHeader: currentHunk,
                      });
                    }
                  }

                  // 2. Verificar credenciais genéricas em arquivos não óbvios (ex: appsettings.json, README.md, seeds, .txt)
                  if (isNonObvious) {
                    const genericSecretRegex = /\b(?:password|passwd|api_key|apikey|secret_key|auth_token|bearer_token|private_key)\s*[:=]\s*["']([^"'\s]{8,})["']/gi;
                    const matches = Array.from(cleanLine.matchAll(genericSecretRegex)) as RegExpMatchArray[];

                    for (const m of matches) {
                      const secretVal = m[1];
                      if (
                        !secretVal ||
                        secretVal.includes('${') ||
                        secretVal.includes('process.env') ||
                        secretVal.includes('YOUR_') ||
                        secretVal.includes('EXAMPLE') ||
                        secretVal.includes('test')
                      ) {
                        continue;
                      }

                      const dedupeKey = `${sha}:${filePath}:${secretVal}`;
                      if (seenSecretCommit.has(dedupeKey)) continue;
                      seenSecretCommit.add(dedupeKey);

                      const maskedSecret = maskSecretValue(secretVal);
                      leaks.push({
                        commitSha: sha,
                        commitShortSha: sha.substring(0, 7),
                        commitMessage,
                        author,
                        filePath,
                        fileType,
                        isNonObvious: true,
                        provider: 'Generic Secret',
                        patternName: 'Credencial em Ficheiro Não Óbvio',
                        ruleId: 'R03a',
                        severity: 'CRITICO',
                        maskedSecret,
                        rawSecret: secretVal,
                        rawSecretPreview: maskedSecret,
                        lineSnippet: cleanLine.replace(secretVal, maskedSecret).trim(),
                        lineNumber: currentLineInFile > 0 ? currentLineInFile : undefined,
                        changeType: 'added',
                        patchHunkHeader: currentHunk,
                      });
                    }
                  }
                } else if (!line.startsWith('-')) {
                  // Linha de contexto não modificada
                  currentLineInFile++;
                }
              }
            }
          } catch (commitErr) {
            console.error(`Erro ao analisar commit ${sha}:`, commitErr);
          }
        })
      );
    }

    // Gerar resumo quantitativo
    const providerCounts: Record<string, number> = {};
    let nonObviousCount = 0;

    for (const leak of leaks) {
      providerCounts[leak.provider] = (providerCounts[leak.provider] || 0) + 1;
      if (leak.isNonObvious) nonObviousCount++;
    }

    return NextResponse.json({
      success: true,
      scannedCommitsCount: commitList.length,
      leaks,
      summary: {
        totalLeaks: leaks.length,
        providers: providerCounts,
        nonObviousCount,
        criticalCount: leaks.filter((l) => l.severity === 'CRITICO').length,
        highCount: leaks.filter((l) => l.severity === 'ALTO').length,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
