import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export type WatermarkMode = 'text' | 'image' | 'tiled';
export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface WatermarkOptions extends ToolOptions {
  mode: WatermarkMode;
  // Text watermark
  text?: string;
  fontSize?: number;
  fontColor?: string;
  // Image watermark
  watermarkImage?: HTMLImageElement;
  // Common
  position?: WatermarkPosition;
  opacity?: number;
  rotation?: number;
  padding?: number;
  scale?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getPositionCoords(
  pos: WatermarkPosition,
  canvasW: number,
  canvasH: number,
  wmW: number,
  wmH: number,
  padding: number,
): { x: number; y: number } {
  switch (pos) {
    case 'top-left':
      return { x: padding, y: padding };
    case 'top-right':
      return { x: canvasW - wmW - padding, y: padding };
    case 'bottom-left':
      return { x: padding, y: canvasH - wmH - padding };
    case 'bottom-right':
      return { x: canvasW - wmW - padding, y: canvasH - wmH - padding };
    case 'center':
      return { x: (canvasW - wmW) / 2, y: (canvasH - wmH) / 2 };
  }
}

function drawTextWatermark(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  opts: WatermarkOptions,
) {
  const text = opts.text || '水印';
  const fontSize = opts.fontSize || 32;
  const color = opts.fontColor || '#ffffff';
  const opacity = opts.opacity ?? 0.5;
  const rotation = opts.rotation ?? -30;
  const padding = opts.padding ?? 20;

  ctx.save();
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;

  const metrics = ctx.measureText(text);
  const wmW = metrics.width;
  const wmH = fontSize;

  if (opts.mode === 'tiled') {
    // Tiled watermark: repeat across the entire image
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvasW / 2, -canvasH / 2);

    const stepX = wmW + 80;
    const stepY = wmH + 60;
    for (let y = -canvasH; y < canvasH * 2; y += stepY) {
      for (let x = -canvasW; x < canvasW * 2; x += stepX) {
        ctx.fillText(text, x, y);
      }
    }
  } else {
    const pos = opts.position || 'bottom-right';
    const { x, y } = getPositionCoords(pos, canvasW, canvasH, wmW, wmH, padding);
    ctx.translate(x + wmW / 2, y + wmH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.fillText(text, -wmW / 2, wmH / 2);
  }

  ctx.restore();
}

function drawImageWatermark(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  wmImg: HTMLImageElement,
  opts: WatermarkOptions,
) {
  const opacity = opts.opacity ?? 0.5;
  const scale = opts.scale ?? 0.15;
  const padding = opts.padding ?? 20;

  const wmW = wmImg.width * scale;
  const wmH = wmImg.height * scale;

  ctx.save();
  ctx.globalAlpha = opacity;

  if (opts.mode === 'tiled') {
    const rotation = opts.rotation ?? -30;
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvasW / 2, -canvasH / 2);

    const stepX = wmW + 40;
    const stepY = wmH + 40;
    for (let y = -canvasH; y < canvasH * 2; y += stepY) {
      for (let x = -canvasW; x < canvasW * 2; x += stepX) {
        ctx.drawImage(wmImg, x, y, wmW, wmH);
      }
    }
  } else {
    const pos = opts.position || 'bottom-right';
    const { x, y } = getPositionCoords(pos, canvasW, canvasH, wmW, wmH, padding);
    ctx.drawImage(wmImg, x, y, wmW, wmH);
  }

  ctx.restore();
}

export async function processWatermark(input: FileInput, options: ToolOptions): Promise<FileOutput> {
  const opts = options as WatermarkOptions;

  const img = await loadImage(input.url);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  if (opts.mode === 'text' || opts.mode === 'tiled') {
    drawTextWatermark(ctx, canvas.width, canvas.height, opts);
  } else if (opts.mode === 'image' && opts.watermarkImage) {
    drawImageWatermark(ctx, canvas.width, canvas.height, opts.watermarkImage, opts);
  }

  const outputType = input.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const ext = outputType === 'image/png' ? 'png' : 'jpg';
  const baseName = input.name.replace(/\.[^.]+$/, '');

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), outputType, 0.92);
  });

  return {
    blob,
    name: `${baseName}_watermarked.${ext}`,
    type: outputType,
    size: blob.size,
    url: URL.createObjectURL(blob),
  };
}
