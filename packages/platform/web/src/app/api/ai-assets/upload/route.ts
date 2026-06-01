import { NextResponse, type NextRequest } from 'next/server';
import { getRequestUserId } from '@/server/ai-assets/auth';
import { writeAiAssetBuffer } from '@/server/ai-assets/storage';

const maxReferenceImages = 3;
const maxReferenceImageBytes = 20 * 1024 * 1024;

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const userId = await getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const files = form.getAll('files').filter((item): item is File => item instanceof File);

  if (files.length < 1 || files.length > maxReferenceImages) {
    return NextResponse.json({ error: 'Please upload 1-3 reference images' }, { status: 400 });
  }

  const assets = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: `${file.name} is not an image` }, { status: 400 });
    }
    if (file.size > maxReferenceImageBytes) {
      return NextResponse.json({ error: `${file.name} is larger than 20MB` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await writeAiAssetBuffer({
      prefix: `uploads/${userId}`,
      buffer,
      mimeType: file.type,
      fileName: file.name,
    });

    assets.push({
      storageKey: stored.storageKey,
      mimeType: file.type,
      fileName: file.name,
      size: stored.size,
    });
  }

  return NextResponse.json({ assets });
}
