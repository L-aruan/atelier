import { convertFormat, type ImageFormat } from '@atelier/engine-image';
import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export interface FormatToolOptions extends ToolOptions {
  targetFormat: ImageFormat;
  quality?: number;
}

export async function processFormat(input: FileInput, options: ToolOptions): Promise<FileOutput> {
  const opts = options as FormatToolOptions;
  const blob = await convertFormat(input.file, {
    format: opts.targetFormat,
    quality: opts.quality ?? 0.92,
  });

  const ext = opts.targetFormat.split('/')[1];
  const baseName = input.name.replace(/\.[^.]+$/, '');
  const name = `${baseName}.${ext}`;

  return { blob, name, type: blob.type, size: blob.size, url: URL.createObjectURL(blob) };
}
