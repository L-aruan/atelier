import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { getRequestUserId } from '@/server/ai-assets/auth';
import { readAiAssetBuffer } from '@/server/ai-assets/storage';

export const runtime = 'nodejs';

function headerSafeFileName(fileName: string) {
  return fileName.replace(/[\r\n"]/g, '_');
}

export async function GET(req: NextRequest, { params }: { params: { assetId: string } }) {
  const userId = await getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const asset = await prisma.aiGenerationAsset.findFirst({
    where: {
      id: params.assetId,
      job: { userId },
    },
  });

  if (!asset?.storageKey) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const buffer = await readAiAssetBuffer(asset.storageKey);
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': asset.mimeType || 'application/octet-stream',
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="${headerSafeFileName(
        asset.fileName || `${asset.id}.png`,
      )}"`,
    },
  });
}
