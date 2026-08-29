import { NextResponse } from 'next/server';
import { harnessEngine } from '@/server/agent/harness';

export const runtime = 'nodejs';

export async function GET() {
  const tools = harnessEngine.getRegisteredTools().map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  return NextResponse.json({
    engine: 'DeepSeek-Harness Engine (Cordis Architecture)',
    status: 'online',
    version: '1.2.0',
    totalTools: tools.length,
    tools,
  });
}
