mport { loadImage, canvasToBlob, fileToObjectURL } from './utils';

export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface FormatOptions {
  format: ImageFormat;
  quality?: number;
}

export async function convertFormat(file: File, options: FormatOptions): Promise<Blob> {
  const url = fileToObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');
    ctx.drawImage(img, 0, 0);

    return canvasToBlob(canvas, options.format, options.quality ?? 0.92);
  } finally {
    URL.revokeObjectURL(url);
  }
}
