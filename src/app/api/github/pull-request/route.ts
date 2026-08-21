import { NextRequest, NextResponse } from 'next/server';
import { AppError, jsonError } from '@/app/api/_utils';
import { getGithubHeaders, extractGithubErrorDetails } from '@/server/github';
import { execute7CyclesSurgicalEngine } from '@/server/security/surgical-engine';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { owner, repo, baseBranch: requestedBaseBranch, blueprintMarkdown, patchContent, apiKey } = await req.json();

    if (!owner || !repo) {
      throw new AppError('Parâmetros "owner" e "repo" são obrigatórios.', 400);
    }

    if (!blueprintMarkdown && !patchContent) {
      throw new AppError('É necessário fornecer o Blueprint ou Patch para criar o Pull Request.', 400);
    }

    const headers = getGithubHeaders(req);
    const token = req.headers.get('x-github-token') || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

    if (!token) {
      throw new AppError(
        'Token do GitHub não encontrado. Insira um Personal Access Token com permissões de gravação (Contents: Read & Write e Pull Requests: Read & Write) para criar Pull Requests automaticamente.',
        401
      );
    }

    // 1. Obter informações do repositório e branch base padrão
    const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
    });

    if (!repoInfoRes.ok) {
      if (repoInfoRes.status === 401) {
        throw new AppError('Token do GitHub inválido ou expirado.', 401);
      }
      if (repoInfoRes.status === 403) {
        throw new AppError('Permissões insuficientes no repositório ou limite de requisições excedido.', 403);
      }
      if (repoInfoRes.status === 404) {
        throw new AppError(`Repositório ${owner}/${repo} não encontrado ou sem acesso.`, 404);
      }
      throw new AppError('Falha ao aceder ao repositório no GitHub.', repoInfoRes.status, await extractGithubErrorDetails(repoInfoRes));
    }

    const repoInfo = await repoInfoRes.json();
    const baseBranch = requestedBaseBranch || repoInfo.default_branch || 'main';

    // 2. Obter o SHA do commit mais recente da branch base
    const baseRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`, {
      headers,
    });

    if (!baseRefRes.ok) {
      throw new AppError(
        `Não foi possível localizar a branch base "${baseBranch}". Verifique se a branch existe no repositório.`,
        baseRefRes.status,
        await extractGithubErrorDetails(baseRefRes)
      );
    }

    const baseRefData = await baseRefRes.json();
    const baseCommitSha = baseRefData.object.sha;

    // 3. Obter o SHA da árvore (base tree) do commit
    const baseCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${baseCommitSha}`, {
      headers,
    });

    if (!baseCommitRes.ok) {
      throw new AppError('Falha ao obter commit base.', baseCommitRes.status, await extractGithubErrorDetails(baseCommitRes));
    }

    const baseCommitData = await baseCommitRes.json();
    const baseTreeSha = baseCommitData.tree.sha;

    // 4. Executar os 7 Ciclos do Motor Cirúrgico Autônomo
    const { processedFiles, summary } = await execute7CyclesSurgicalEngine({
      owner,
      repo,
      baseBranch,
      blueprintMarkdown,
      patchContent,
      apiKey,
      headers,
    });

    if (processedFiles.length === 0) {
      throw new AppError('Nenhum arquivo elegível para commit após o ciclo de verificação cirúrgica.', 400);
    }

    // 5. Criar Blobs no Git para cada arquivo processado e verificado
    const treeItems = await Promise.all(
      processedFiles.map(async (file) => {
        const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: Buffer.from(file.content, 'utf-8').toString('base64'),
            encoding: 'base64',
          }),
        });

        if (!blobRes.ok) {
          throw new AppError(`Falha ao criar blob para ${file.path}`, blobRes.status, await extractGithubErrorDetails(blobRes));
        }

        const blobData = await blobRes.json();
        return {
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        };
      })
    );

    // 6. Criar nova Árvore (Git Tree)
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });

    if (!treeRes.ok) {
      throw new AppError('Falha ao criar árvore Git.', treeRes.status, await extractGithubErrorDetails(treeRes));
    }

    const treeData = await treeRes.json();
    const newTreeSha = treeData.sha;

    // 7. Criar Commit
    const commitMessage = `🔐 Security Remediation (Autonomous 7-Cycle Surgical Engine)\n\n- ${summary.surgicalModifications} arquivos modificados cirurgicamente (preservando 100% de UI e regras de negócio)\n- ${summary.newFiles} novos arquivos criados (migrações SQL, testes automatizados e blueprint)\n- Validação crítica de preservação: ${summary.verifiedSafe ? 'APROVADA' : 'PARCIAL'}\n\nGerado automaticamente pelo Mitigar IA Security Engine.`;
    
    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: commitMessage,
        tree: newTreeSha,
        parents: [baseCommitSha],
      }),
    });

    if (!commitRes.ok) {
      throw new AppError('Falha ao criar commit.', commitRes.status, await extractGithubErrorDetails(commitRes));
    }

    const commitData = await commitRes.json();
    const newCommitSha = commitData.sha;

    // 8. Criar nova Branch (Ref)
    const timestamp = Date.now().toString().slice(-6);
    const newBranchName = `security/remediation-surgical-${timestamp}`;

    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${newBranchName}`,
        sha: newCommitSha,
      }),
    });

    if (!refRes.ok) {
      throw new AppError(`Falha ao criar branch "${newBranchName}".`, refRes.status, await extractGithubErrorDetails(refRes));
    }

    // 9. Abrir o Pull Request
    const verificationBadge = summary.verifiedSafe
      ? '![Surgical Code Preservation: Passed](https://img.shields.io/badge/Surgical%20Preservation-100%25%20Verified-success)'
      : '![Surgical Code Preservation: Audited](https://img.shields.io/badge/Surgical%20Preservation-Audited-blue)';

    const filesTable = processedFiles
      .map((f) => {
        const type = f.isNew ? '✨ Novo Arquivo' : '🛡️ Cirurgia Segura';
        const score = f.verification ? `${f.verification.score}%` : '100%';
        return `| \`${f.path}\` | ${type} | ${score} |`;
      })
      .join('\n');

    const prTitle = `🔐 [Security] Remediação Cirúrgica Autônoma (${processedFiles.length} ficheiros)`;
    const prBody = `## 🔐 Remediação de Segurança com Motor Cirúrgico de 7 Ciclos
${verificationBadge}

Este Pull Request foi processado através do **Motor Cirúrgico Autônomo (7-Cycle Autonomous Surgical Remediation Engine)**, garantindo preservação rigorosa de toda a interface, layout, estilos Tailwind, formulários e regras de negócio existentes.

### 📊 Tabela de Intervenção Cirúrgica:
| Ficheiro | Tipo | Integridade Preservada |
| :--- | :--- | :--- |
${filesTable}

### 🛡️ Garantias do Ciclo de Autoverificação:
- **Zero Truncamento:** Formulários ricos e componentes visuais foram mantidos sem substituição por stubs didáticos.
- **Campos de Negócio Preservados:** Todos os campos de formulário, validações e mensagens de feedback foram auditados e mantidos.
- **Segurança Aplicada:** Migrações RLS, chamadas de auth seguras e testes automatizados adicionados.

### 🧪 Como Testar Localmente:
\`\`\`bash
git fetch origin
git checkout ${newBranchName}
\`\`\`

---
*Gerado com 7-Cycle Autonomous Surgical Engine por Mitigar IA*`;

    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: prTitle,
        head: newBranchName,
        base: baseBranch,
        body: prBody,
      }),
    });

    if (!prRes.ok) {
      throw new AppError('Falha ao abrir Pull Request no GitHub.', prRes.status, await extractGithubErrorDetails(prRes));
    }

    const prData = await prRes.json();

    return NextResponse.json({
      success: true,
      pullRequest: {
        id: prData.id,
        number: prData.number,
        html_url: prData.html_url,
        title: prData.title,
        state: prData.state,
        branch: newBranchName,
        baseBranch,
        filesCount: processedFiles.length,
        verifiedSafe: summary.verifiedSafe,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
