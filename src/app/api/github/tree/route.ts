import { NextRequest, NextResponse } from 'next/server';
import { AppError, jsonError } from '@/app/api/_utils';
import { cacheService } from '@/server/cache.service';
import { extractGithubErrorDetails, getGithubHeaders } from '@/server/github';
import { GithubRepoInfo, GithubTreeResponse } from '@/server/github.types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const owner = req.nextUrl.searchParams.get('owner');
    const repo = req.nextUrl.searchParams.get('repo');
    const branch = req.nextUrl.searchParams.get('branch');

    if (!owner || !repo) throw new AppError('Owner e repositório são obrigatórios', 400);

    let headers = getGithubHeaders(req);
    let targetBranch = branch || '';

    if (!targetBranch) {
      let repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      
      // If token failed with 401 Unauthorized, retry anonymously in case it's a public repo
      if (repoInfoRes.status === 401 && headers.Authorization) {
        const publicHeaders = {
          'User-Agent': 'Vibe-Workbench',
          Accept: 'application/vnd.github.v3+json',
        };
        const retryRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: publicHeaders });
        if (retryRes.ok) {
          repoInfoRes = retryRes;
          headers = publicHeaders;
        }
      }

      if (!repoInfoRes.ok) {
        const details = await extractGithubErrorDetails(repoInfoRes);
        const errorMsg = repoInfoRes.status === 404
          ? `Repositório "${owner}/${repo}" não encontrado ou privado. Se for privado, configure um GitHub Token nas configurações.`
          : repoInfoRes.status === 401
          ? 'Token do GitHub inválido ou expirado.'
          : repoInfoRes.status === 403
          ? 'Limite de requisições da API do GitHub atingido. Adicione um GitHub Token nas configurações para aumentar o limite.'
          : 'Falha ao buscar informações do repositório';
        throw new AppError(errorMsg, repoInfoRes.status, details);
      }
      const repoInfo = (await repoInfoRes.json()) as GithubRepoInfo;
      targetBranch = repoInfo.default_branch || 'main';
    }

    const cachedTree = cacheService.getTree(owner, repo, targetBranch);
    if (cachedTree) return NextResponse.json(cachedTree);

    let treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`, { headers });
    
    // If tree fetch failed with 401 and had auth, retry anonymously
    if (treeRes.status === 401 && headers.Authorization) {
      const publicHeaders = {
        'User-Agent': 'Vibe-Workbench',
        Accept: 'application/vnd.github.v3+json',
      };
      const retryTreeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`, { headers: publicHeaders });
      if (retryTreeRes.ok) {
        treeRes = retryTreeRes;
      }
    }

    if (!treeRes.ok) {
      const details = await extractGithubErrorDetails(treeRes);
      throw new AppError('Falha ao obter árvore de arquivos do repositório', treeRes.status, details);
    }

    const treeData = (await treeRes.json()) as GithubTreeResponse;
    const result = { owner, repo, branch: targetBranch, tree: treeData.tree || [] };
    cacheService.setTree(owner, repo, targetBranch, result);

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
