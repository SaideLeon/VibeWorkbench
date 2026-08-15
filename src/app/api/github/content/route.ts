import { NextRequest, NextResponse } from 'next/server';
import { AppError, jsonError } from '@/app/api/_utils';
import { cacheService } from '@/server/cache.service';
import { getGithubHeaders, isBinaryBuffer } from '@/server/github';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const owner = req.nextUrl.searchParams.get('owner');
    const repo = req.nextUrl.searchParams.get('repo');
    const filePath = req.nextUrl.searchParams.get('path');
    const branch = req.nextUrl.searchParams.get('branch');

    if (!owner || !repo || !filePath || !branch) throw new AppError('Missing required parameters', 400);

    const cachedContent = cacheService.getFileContent(owner, repo, branch, filePath);
    if (cachedContent) return new NextResponse(cachedContent);

    const headers = getGithubHeaders(req);

    // Try GitHub API with raw header first (supports private repos with token)
    let response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`,
      {
        headers: {
          ...headers,
          Accept: 'application/vnd.github.raw+json, application/vnd.github.v3.raw',
        },
      }
    );

    // Fallback to raw.githubusercontent.com
    if (!response.ok) {
      const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${filePath}`, {
        headers,
      });
      if (rawRes.ok) {
        response = rawRes;
      }
    }

    if (!response.ok) {
      throw new AppError('Failed to fetch file content', response.status, {
        status: response.status,
        statusText: response.statusText,
        githubRequestId: response.headers.get('x-github-request-id') || undefined,
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (isBinaryBuffer(buffer)) {
      return new NextResponse('Binary files are not supported for analysis', { status: 400 });
    }

    const content = buffer.toString('utf-8');
    cacheService.setFileContent(owner, repo, branch, filePath, content);
    return new NextResponse(content);
  } catch (error) {
    return jsonError(error);
  }
}
