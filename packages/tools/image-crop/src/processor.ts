import { cropImage, type CropRegion } from '@mediabox/engine-image';
import type { FileInput, FileOutput, ToolOptions } from '@mediabox/types';

export interface CropToolOptions extends ToolOptions {
  region: CropRegion;
  outputFormat?: string;
  quality?: number;
}

export async function processCrop(input: FileInput, options: CropToolOptions): Promise<FileOutput> {
  const blob = await cropImage(input.file, {
    region: options.region,
    outputType: options.outputFormat || input.type,
    quality: options.quality ?? 0.92,
  });

  const ext = (options.outputFormat || input.type).split('/')[1] || 'png';
  const baseName = input.name.replace(/\.[^.]+$/, '');
  const name = `${baseName}_cropped.${ext}`;

  return {
    blob,
    name,
    type: blob.type,
    size: blob.size,
    url: URL.createObjectURL(blob),
  };
}
