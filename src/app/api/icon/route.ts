import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const pngPath = path.join(process.cwd(), 'src/assets/images/novo_logo_logo.png');
    const legacyPath = path.join(process.cwd(), 'public/logo.png');
    const targetPath = fs.existsSync(pngPath) ? pngPath : legacyPath;
    
    const imageBuffer = fs.readFileSync(targetPath);

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new NextResponse(null, { status: 404 });
  }
}
