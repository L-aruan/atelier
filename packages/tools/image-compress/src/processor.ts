import { compressImage } from '@atelier/engine-image';
import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export interface CompressToolOptions extends ToolOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

export async function processCompress(input: FileInput, options: ToolOptions): Promise<FileOutput> {
  const opts = options as CompressToolOptions;
  const compressed = await compressImage(input.file, {
    maxSizeMB: opts.maxSizeMB ?? 1,
    maxWidthOrHeight: opts.maxWidthOrHeight ?? 1920,
    quality: opts.quality ?? 0.8,
  });

  const baseName = input.name.replace(/\.[^.]+$/, '');
  const ext = input.type.split('/')[1] || 'jpg';
  const name = `${baseName}_compressed.${ext}`;

  return {
    blob: compressed,
    name,
    type: compressed.type,
    size: compressed.size,
    url: URL.createObjectURL(compressed),
  };
}
