import { NextRequest, NextResponse } from 'next/server';
import { harnessEngine } from '@/server/agent/harness';
import { jsonError } from '@/app/api/_utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { 
      userGoal, 
      files, 
      repoName, 
      apiKey, 
      activeFile, 
      treeOverview,
      maxIterations,
      model
    } = await req.json();

    if (!userGoal) {
      return NextResponse.json(
        { error: 'Parâmetro userGoal é obrigatório para iniciar o agente.' },
        { status: 400 }
      );
    }

    const result = await harnessEngine.run(userGoal, {
      model,
      maxIterations: maxIterations || 4,
      apiKey,
      context: {
        repoName: repoName || 'Repositório Ativo',
        files: files || [],
        activeFile,
        treeOverview,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
