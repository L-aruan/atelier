import JSZip from 'jszip';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { getRequestUserId } from '@/server/ai-assets/auth';
import { readAiAssetBuffer } from '@/server/ai-assets/storage';

export const runtime = 'nodejs';

function headerSafeFileName(fileName: string) {
  return fileName.replace(/[\r\n"]/g, '_');
}

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const userId = await getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const job = await prisma.aiGenerationJob.findFirst({
    where: {
      id: params.jobId,
      userId,
    },
    include: {
      assets: {
        where: {
          assetType: 'image',
          storageKey: { not: null },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const zip = new JSZip();
  for (const asset of job.assets) {
    if (!asset.storageKey) continue;
    const buffer = await readAiAssetBuffer(asset.storageKey);
    zip.file(asset.fileName || `${asset.id}.png`, buffer);
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  const fileName = headerSafeFileName(
    `${job.productName || job.toolId || 'ai-assets'}-${job.id}.zip`,
  );

  return new Response(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Length': String(zipBuffer.byteLength),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
