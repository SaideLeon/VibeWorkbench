import { NextRequest, NextResponse } from 'next/server';
import { AppError, jsonError } from '@/app/api/_utils';
import { getGithubHeaders, extractGithubErrorDetails } from '@/server/github';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const branch = searchParams.get('branch');

    if (!owner || !repo) {
      throw new AppError('Parâmetros "owner" e "repo" são obrigatórios.', 400);
    }

    const headers = getGithubHeaders(req);
    const branchQuery = branch ? `&sha=${encodeURIComponent(branch)}` : '';
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=30${branchQuery}`;

    const res = await fetch(url, { headers });

    if (!res.ok) {
      if (res.status === 404) {
        throw new AppError(`Repositório ${owner}/${repo} não encontrado ou sem permissão de acesso.`, 404);
      }
      if (res.status === 401) {
        throw new AppError('Token do GitHub inválido ou expirado.', 401);
      }
      if (res.status === 403) {
        throw new AppError('Limite de requisições excedido ou permissões insuficientes.', 403);
      }
      throw new AppError('Falha ao listar commits do repositório.', res.status, await extractGithubErrorDetails(res));
    }

    const rawCommits = await res.json();

    const commits = rawCommits.map((c: any, index: number) => ({
      sha: c.sha,
      shortSha: c.sha ? c.sha.substring(0, 7) : '',
      message: c.commit?.message || '',
      author: {
        name: c.commit?.author?.name || c.author?.login || 'Autor desconhecido',
        avatar_url: c.author?.avatar_url || null,
        date: c.commit?.author?.date || null,
      },
      html_url: c.html_url,
      isHead: index === 0,
      parents: (c.parents || []).map((p: any) => p.sha),
    }));

    return NextResponse.json({
      success: true,
      commits,
      total: commits.length,
    });
  } catch (error) {
    return jsonError(error);
  }
}
