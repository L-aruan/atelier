import path from 'path';
import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';

const assetRoot = path.resolve(
  process.env.ATELIER_AI_ASSET_DIR || path.join(process.cwd(), '.atelier-ai-assets'),
);

const mimeExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/zip': '.zip',
};

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 80);
}

function extensionFor(mimeType: string, fileName?: string) {
  const fileExt = fileName ? path.extname(fileName).toLowerCase() : '';
  if (fileExt && /^[a-z0-9.]+$/.test(fileExt)) return fileExt;
  return mimeExtensions[mimeType] || '.bin';
}

export function resolveAiAssetPath(storageKey: string) {
  if (!storageKey || path.isAbsolute(storageKey) || storageKey.includes('..')) {
    throw new Error('Invalid AI asset storage key');
  }

  const resolved = path.resolve(assetRoot, storageKey);
  if (resolved !== assetRoot && !resolved.startsWith(`${assetRoot}${path.sep}`)) {
    throw new Error('Invalid AI asset storage path');
  }
  return resolved;
}

export async function writeAiAssetBuffer(params: {
  prefix: string;
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
}) {
  const prefix = params.prefix
    .split(/[\\/]+/)
    .map(safeSegment)
    .filter(Boolean)
    .join('/');
  const storageKey = `${prefix}/${randomUUID()}${extensionFor(params.mimeType, params.fileName)}`;
  const filePath = resolveAiAssetPath(storageKey);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, params.buffer);

  return {
    storageKey,
    size: params.buffer.byteLength,
  };
}

export async function readAiAssetBuffer(storageKey: string) {
  return readFile(resolveAiAssetPath(storageKey));
}
