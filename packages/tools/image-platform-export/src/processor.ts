import JSZip from 'jszip';
import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export interface ExportPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  platform: string;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  { id: 'taobao-main', label: '淘宝主图', width: 800, height: 800, platform: 'taobao' },
  { id: 'jd-main', label: '京东主图', width: 800, height: 800, platform: 'jd' },
  { id: 'pdd-main', label: '拼多多主图', width: 750, height: 750, platform: 'pdd' },
  { id: 'taobao-detail', label: '淘宝详情图', width: 750, height: 1000, platform: 'taobao' },
  { id: 'douyin-goods', label: '抖音商品图', width: 750, height: 1000, platform: 'douyin' },
  { id: 'xiaohongshu', label: '小红书封面', width: 1080, height: 1440, platform: 'xiaohongshu' },
  { id: 'bilibili-cover', label: 'B站封面', width: 1920, height: 1080, platform: 'bilibili' },
  { id: 'wechat-cover', label: '公众号封面', width: 900, height: 500, platform: 'wechat' },
];

export interface ExportBundle {
  id: string;
  name: string;
  presetIds: string[];
}

export const EXPORT_BUNDLES: ExportBundle[] = [
  {
    id: 'ecommerce',
    name: '电商上架图',
    presetIds: ['taobao-main', 'jd-main', 'pdd-main', 'taobao-detail', 'douyin-goods'],
  },
  {
    id: 'social',
    name: '社媒封面',
    presetIds: ['xiaohongshu', 'bilibili-cover', 'wechat-cover'],
  },
  {
    id: 'all',
    name: '全部平台',
    presetIds: EXPORT_PRESETS.map((p) => p.id),
  },
];

export interface PlatformExportOptions extends ToolOptions {
  presetIds?: string[];
  mode?: 'fill' | 'fit';
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number;
  backgroundColor?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('无法读取图片'));
    img.src = src;
  });
}

function extensionFor(type: string): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

async function renderPreset(
  img: HTMLImageElement,
  preset: ExportPreset,
  options: Required<Pick<PlatformExportOptions, 'mode' | 'outputFormat' | 'quality' | 'backgroundColor'>>,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = preset.width;
  canvas.height = preset.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持 Canvas');

  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(0, 0, preset.width, preset.height);

  const scale =
    options.mode === 'fit'
      ? Math.min(preset.width / img.naturalWidth, preset.height / img.naturalHeight)
      : Math.max(preset.width / img.naturalWidth, preset.height / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const drawX = (preset.width - drawW) / 2;
  const drawY = (preset.height - drawH) / 2;
  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('图片导出失败'));
      },
      options.outputFormat,
      options.quality,
    );
  });
}

export async function processPlatformExport(
  input: FileInput,
  options: ToolOptions,
): Promise<FileOutput> {
  const opts = options as PlatformExportOptions;
  const selectedIds = opts.presetIds?.length
    ? opts.presetIds
    : EXPORT_BUNDLES[0].presetIds;
  const presets = EXPORT_PRESETS.filter((p) => selectedIds.includes(p.id));
  if (presets.length === 0) throw new Error('请至少选择一个导出尺寸');

  const renderOptions = {
    mode: opts.mode ?? 'fill',
    outputFormat: opts.outputFormat ?? 'image/jpeg',
    quality: opts.quality ?? 0.9,
    backgroundColor: opts.backgroundColor ?? '#ffffff',
  };

  const img = await loadImage(input.url);
  const zip = new JSZip();
  const baseName = input.name.replace(/\.[^.]+$/, '');
  const ext = extensionFor(renderOptions.outputFormat);

  for (const preset of presets) {
    const blob = await renderPreset(img, preset, renderOptions);
    zip.file(`${preset.platform}/${baseName}_${preset.id}_${preset.width}x${preset.height}.${ext}`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return {
    blob: zipBlob,
    name: `${baseName}_platform_exports.zip`,
    type: 'application/zip',
    size: zipBlob.size,
    url: URL.createObjectURL(zipBlob),
  };
}
