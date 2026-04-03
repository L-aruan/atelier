import { loadImage, canvasToBlob, fileToObjectURL } from './utils';

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropOptions {
  region: CropRegion;
  outputType?: string;
  quality?: number;
}

export async function cropImage(file: File, options: CropOptions): Promise<Blob> {
  const url = fileToObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = options.region.width;
    canvas.height = options.region.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');

    ctx.drawImage(
      img,
      options.region.x,
      options.region.y,
      options.region.width,
      options.region.height,
      0,
      0,
      options.region.width,
      options.region.height,
    );

    return canvasToBlob(canvas, options.outputType || file.type, options.quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
