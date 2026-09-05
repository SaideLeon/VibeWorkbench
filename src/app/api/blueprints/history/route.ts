import { NextRequest, NextResponse } from 'next/server';
import { blueprintHistoryService } from '@/server/db/blueprint-history.service';
import { isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * GET /api/blueprints/history
 * Retorna os últimos 5 blueprints gerados para recuperação
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const email = searchParams.get('email') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const projectName = searchParams.get('projectName') || undefined;

    const blueprints = await blueprintHistoryService.getRecentBlueprints(email, userId, projectName);

    return NextResponse.json({
      success: true,
      count: blueprints.length,
      maxLimit: 5,
      supabaseConnected: isSupabaseConfigured(),
      blueprints
    });
  } catch (err: any) {
    console.error('[API Blueprint History GET] Erro:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Falha ao recuperar histórico de blueprints' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blueprints/history
 * Salva um novo blueprint no histórico (garante que apenas os últimos 5 sejam guardados)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectName,
      title,
      summary,
      totalFindings,
      criticalCount,
      highCount,
      mediumCount,
      blueprintMarkdown,
      patchContent,
      userEmail,
      userId,
      metadata
    } = body;

    if (!blueprintMarkdown || typeof blueprintMarkdown !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Conteúdo do blueprintMarkdown é obrigatório.' },
        { status: 400 }
      );
    }

    const savedItem = await blueprintHistoryService.saveBlueprint({
      projectName: projectName || 'Projecto',
      title: title || `Blueprint de Segurança - ${projectName || 'Projecto'}`,
      summary,
      totalFindings: totalFindings ?? 0,
      criticalCount: criticalCount ?? 0,
      highCount: highCount ?? 0,
      mediumCount: mediumCount ?? 0,
      blueprintMarkdown,
      patchContent,
      userEmail,
      userId,
      metadata
    });

    return NextResponse.json({
      success: true,
      message: 'Blueprint registrado no histórico (mantendo os últimos 5)',
      blueprint: savedItem,
      supabaseConnected: isSupabaseConfigured()
    });
  } catch (err: any) {
    console.error('[API Blueprint History POST] Erro:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Falha ao salvar blueprint no histórico' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blueprints/history?id=...
 * Remove um blueprint específico do histórico
 */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID do blueprint é obrigatório' }, { status: 400 });
    }

    const deleted = await blueprintHistoryService.deleteBlueprint(id);

    return NextResponse.json({
      success: true,
      deleted
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Falha ao remover blueprint' },
      { status: 500 }
    );
  }
}
