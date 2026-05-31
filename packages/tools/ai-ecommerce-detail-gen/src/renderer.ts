import type { DetailPagePlan } from './types';

export interface RenderOptions {
  width: number;
  height: number;
  productName: string;
}

const TYPE_LABELS: Record<string, string> = {
  hero: '视觉开篇',
  value: '核心卖点',
  scene: '场景沉浸',
  structure: '结构拆解',
  material: '质感细节',
  specs: '规格说明',
  accessories: '配件展示',
  usage: '使用示意',
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src.startsWith('data:') ? src : `data:image/png;base64,${src}`;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const chars = Array.from(text);
  const lines: string[] = [];
  let current = '';

  for (const char of chars) {
    const next = `${current}${char}`;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char;
      if (lines.length >= maxLines - 1) break;
    } else {
      current = next;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / img.width, height / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
}

function drawGradientOverlay(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const top = ctx.createLinearGradient(0, 0, 0, height * 0.35);
  top.addColorStop(0, 'rgba(22, 18, 12, 0.58)');
  top.addColorStop(1, 'rgba(22, 18, 12, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, width, height * 0.38);

  const bottom = ctx.createLinearGradient(0, height * 0.58, 0, height);
  bottom.addColorStop(0, 'rgba(22, 18, 12, 0)');
  bottom.addColorStop(1, 'rgba(22, 18, 12, 0.5)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, height * 0.58, width, height * 0.42);
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  page: DetailPagePlan,
  options: RenderOptions,
) {
  const { width, height, productName } = options;
  const pad = Math.round(width * 0.065);
  const label = TYPE_LABELS[page.type] || '详情图';

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  drawRoundedRect(ctx, pad, pad, 120, 34, 6);
  ctx.fill();
  ctx.fillStyle = '#6a4b1f';
  ctx.font = '600 18px Arial, sans-serif';
  ctx.fillText(label, pad + 18, pad + 23);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 54px Arial, sans-serif';
  const titleLines = wrapText(ctx, page.title, width - pad * 2, 2);
  titleLines.forEach((line, index) => {
    ctx.fillText(line, pad, pad + 104 + index * 64);
  });

  ctx.font = '500 25px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  const subtitleLines = wrapText(ctx, page.subtitle || productName, width - pad * 2, 2);
  subtitleLines.forEach((line, index) => {
    ctx.fillText(line, pad, pad + 248 + index * 34);
  });

  const bullets = Array.isArray(page.bullets) ? page.bullets : [];
  if (bullets.length === 0) return;

  const boxY = height - pad - 152;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  drawRoundedRect(ctx, pad, boxY, width - pad * 2, 132, 8);
  ctx.fill();

  ctx.fillStyle = '#2f2418';
  ctx.font = '600 22px Arial, sans-serif';
  bullets.slice(0, 3).forEach((item, index) => {
    ctx.fillText(`• ${item}`, pad + 30, boxY + 40 + index * 34);
  });
}

function drawHotspots(ctx: CanvasRenderingContext2D, page: DetailPagePlan, options: RenderOptions) {
  const { width, height } = options;
  const hotspots = Array.isArray(page.hotspots) ? page.hotspots : [];
  if (hotspots.length === 0) return;

  ctx.strokeStyle = 'rgba(74, 56, 30, 0.9)';
  ctx.fillStyle = '#3c2b17';
  ctx.lineWidth = 2;
  ctx.font = '600 19px Arial, sans-serif';

  hotspots.slice(0, 4).forEach((hotspot, index) => {
    const x = Math.max(70, Math.min(width - 70, hotspot.x * width));
    const y = Math.max(300, Math.min(height - 220, hotspot.y * height));
    const alignLeft = index % 2 === 0;
    const labelX = alignLeft ? 46 : width - 246;
    const labelY = y - 38;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(alignLeft ? labelX + 185 : labelX, labelY + 24);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    drawRoundedRect(ctx, labelX, labelY, 200, 58, 6);
    ctx.fill();
    ctx.fillStyle = '#3c2b17';
    ctx.fillText(hotspot.label, labelX + 14, labelY + 25);
    ctx.font = '400 14px Arial, sans-serif';
    ctx.fillText(hotspot.description.slice(0, 12), labelX + 14, labelY + 46);
    ctx.font = '600 19px Arial, sans-serif';
  });
}

export async function renderDetailPage(
  page: DetailPagePlan,
  options: RenderOptions,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 初始化失败');

  const img = await loadImage(page.imageBase64);
  drawCoverImage(ctx, img, options.width, options.height);
  drawGradientOverlay(ctx, options.width, options.height);

  if (page.type === 'structure' || page.type === 'material' || page.type === 'specs') {
    drawHotspots(ctx, page, options);
  }

  drawTextBlock(ctx, page, options);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('图片导出失败'));
    }, 'image/png');
  });
}
