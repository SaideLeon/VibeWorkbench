import { NextRequest, NextResponse } from 'next/server';
import { AppError, jsonError } from '@/app/api/_utils';
import { extractGithubErrorDetails } from '@/server/github';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const userToken = req.headers.get('x-github-token');
    if (!userToken) {
      throw new AppError('GitHub token is required to list repositories', 401, {
        reason: 'missing_header',
        header: 'x-github-token',
      });
    }

    const cleanToken = userToken.trim();
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&type=all', {
      headers: {
        'User-Agent': 'Vibe-Workbench',
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${cleanToken}`,
      },
    });

    if (!response.ok) {
      const details = await extractGithubErrorDetails(response);
      const errorMessage = response.status === 401
        ? 'Token do GitHub inválido ou expirado. Remova ou atualize o token nas configurações.'
        : response.status === 403
        ? 'Limite de requisições atingido ou permissões insuficientes no token GitHub.'
        : 'Falha ao buscar repositórios do GitHub';
      throw new AppError(errorMessage, response.status, details);
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    return jsonError(error);
  }
}
