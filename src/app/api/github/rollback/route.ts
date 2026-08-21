import { NextRequest, NextResponse } from 'next/server';
import { AppError, jsonError } from '@/app/api/_utils';
import { getGithubHeaders, extractGithubErrorDetails } from '@/server/github';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { owner, repo, branch: requestedBranch, targetSha, mode = 'safe_revert' } = await req.json();

    if (!owner || !repo) {
      throw new AppError('Parâmetros "owner" e "repo" são obrigatórios.', 400);
    }

    if (!targetSha) {
      throw new AppError('O parâmetro "targetSha" (commit de destino) é obrigatório.', 400);
    }

    const headers = getGithubHeaders(req);
    const token = req.headers.get('x-github-token') || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

    if (!token) {
      throw new AppError(
        'Token do GitHub não fornecido. Para efetuar rollback ou reversão de commits, configure um Personal Access Token com permissão de escrita no repositório.',
        401
      );
    }

    // 1. Obter informações do repositório para determinar branch ativa
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      if (repoRes.status === 401) throw new AppError('Token do GitHub inválido ou expirado.', 401);
      if (repoRes.status === 403) throw new AppError('Permissões insuficientes para modificar o repositório.', 403);
      if (repoRes.status === 404) throw new AppError(`Repositório ${owner}/${repo} não encontrado.`, 404);
      throw new AppError('Falha ao aceder ao repositório no GitHub.', repoRes.status, await extractGithubErrorDetails(repoRes));
    }

    const repoInfo = await repoRes.json();
    const branch = requestedBranch || repoInfo.default_branch || 'main';

    // 2. Verificar se o targetSha existe e obter dados do commit alvo
    const targetCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${targetSha}`, {
      headers,
    });

    if (!targetCommitRes.ok) {
      throw new AppError(`Commit de destino "${targetSha.slice(0, 7)}" não foi encontrado no repositório.`, targetCommitRes.status, await extractGithubErrorDetails(targetCommitRes));
    }

    const targetCommitData = await targetCommitRes.json();
    const targetTreeSha = targetCommitData.tree.sha;

    // 3. Obter o HEAD atual da branch
    const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`;
    const headRefRes = await fetch(refUrl, { headers });

    if (!headRefRes.ok) {
      throw new AppError(`Branch "${branch}" não encontrada no repositório.`, headRefRes.status, await extractGithubErrorDetails(headRefRes));
    }

    const headRefData = await headRefRes.json();
    const currentHeadSha = headRefData.object.sha;

    if (currentHeadSha === targetSha) {
      throw new AppError('A branch já se encontra exatamente no commit selecionado.', 400);
    }

    if (mode === 'force_reset') {
      // MODO 1: Hard Force Reset do ponteiro da branch
      const updateRefRes = await fetch(refUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sha: targetSha,
          force: true,
        }),
      });

      if (!updateRefRes.ok) {
        throw new AppError(
          `Falha ao forçar o reset da branch para o commit ${targetSha.slice(0, 7)}. Verifique se a branch possui regras de proteção de branch (Branch Protection Rules) no GitHub. Se possuir, utilize o modo de Reversão Segura.`,
          updateRefRes.status,
          await extractGithubErrorDetails(updateRefRes)
        );
      }

      return NextResponse.json({
        success: true,
        mode: 'force_reset',
        branch,
        targetSha,
        previousHeadSha: currentHeadSha,
        message: `Branch "${branch}" resetada com sucesso para o commit ${targetSha.slice(0, 7)}.`,
      });
    } else {
      // MODO 2: Safe Revert Commit (Restaura a árvore exata do commit antigo criando um novo commit seguro)
      const targetShort = targetSha.slice(0, 7);
      const commitMessage = `⏪ Rollback: Restaurar estado do repositório para o commit ${targetShort}\n\nReversão executada pelo Mitigar IA para descartar alterações posteriores e restaurar o código original estável.`;

      const createCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: commitMessage,
          tree: targetTreeSha,
          parents: [currentHeadSha],
        }),
      });

      if (!createCommitRes.ok) {
        throw new AppError('Falha ao criar commit de reversão.', createCommitRes.status, await extractGithubErrorDetails(createCommitRes));
      }

      const newCommit = await createCommitRes.json();
      const newCommitSha = newCommit.sha;

      // Atualizar a branch de forma limpa (Fast-Forward)
      const updateBranchRes = await fetch(refUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sha: newCommitSha,
          force: false,
        }),
      });

      if (!updateBranchRes.ok) {
        throw new AppError('Falha ao atualizar a branch com o commit de reversão.', updateBranchRes.status, await extractGithubErrorDetails(updateBranchRes));
      }

      return NextResponse.json({
        success: true,
        mode: 'safe_revert',
        branch,
        targetSha,
        newCommitSha,
        previousHeadSha: currentHeadSha,
        message: `Repositório restaurado com sucesso para a versão do commit ${targetShort}!`,
        html_url: `https://github.com/${owner}/${repo}/commit/${newCommitSha}`,
      });
    }
  } catch (error) {
    return jsonError(error);
  }
}
