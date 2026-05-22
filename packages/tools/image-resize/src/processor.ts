import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export type ResizeMode = 'exact' | 'percentage' | 'fit' | 'fill';

export interface ResizeToolOptions extends ToolOptions {
  width: number;
  height: number;
  mode: ResizeMode;
  keepRatio: boolean;
  backgroundColor?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function processResize(input: FileInput, options: ToolOptions): Promise<FileOutput> {
  const opts = options as ResizeToolOptions;
  const img = await loadImage(input.url);

  let targetW = opts.width;
  let targetH = opts.height;

  if (opts.mode === 'percentage') {
    const scale = opts.width / 100;
    targetW = Math.round(img.width * scale);
    targetH = Math.round(img.height * scale);
  } else if (opts.keepRatio) {
    const ratio = img.width / img.height;
    if (targetW / targetH > ratio) {
      targetW = Math.round(targetH * ratio);
    } else {
      targetH = Math.round(targetW / ratio);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;

  if (opts.mode === 'fill' && opts.backgroundColor) {
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, targetW, targetH);
  }

  if (opts.mode === 'fit') {
    // Fit: scale to fit within bounds, keep aspect ratio
    const scale = Math.min(targetW / img.width, targetH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (targetW - drawW) / 2;
    const drawY = (targetH - drawH) / 2;

    if (opts.backgroundColor) {
      ctx.fillStyle = opts.backgroundColor;
      ctx.fillRect(0, 0, targetW, targetH);
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else if (opts.mode === 'fill') {
    // Fill: scale to cover, crop excess
    const scale = Math.max(targetW / img.width, targetH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (targetW - drawW) / 2;
    const drawY = (targetH - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    // Exact / percentage: direct draw
    ctx.drawImage(img, 0, 0, targetW, targetH);
  }

  const outputType = input.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const ext = outputType === 'image/png' ? 'png' : 'jpg';
  const baseName = input.name.replace(/\.[^.]+$/, '');

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), outputType, 0.92);
  });

  return {
    blob,
    name: `${baseName}_${targetW}x${targetH}.${ext}`,
    type: outputType,
    size: blob.size,
    url: URL.createObjectURL(blob),
  };
}
