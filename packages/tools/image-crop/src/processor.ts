import { cropImage, type CropRegion } from '@atelier/engine-image';
import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export interface CropToolOptions extends ToolOptions {
  region: CropRegion;
  outputFormat?: string;
  quality?: number;
}

export async function processCrop(input: FileInput, options: ToolOptions): Promise<FileOutput> {
  const o = options as CropToolOptions;
  const blob = await cropImage(input.file, {
    region: o.region,
    outputType: o.outputFormat || input.type,
    quality: o.quality ?? 0.92,
  });

  const ext = (o.outputFormat || input.type).split('/')[1] || 'png';
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
