import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';
import JSZip from 'jszip';
import { renderDetailPage } from './renderer';
import type { DetailPagePlan } from './types';

export interface EcommerceDetailGenOptions extends ToolOptions {
  productName: string;
  pages: DetailPagePlan[];
  width?: number;
  height?: number;
}

export async function renderEcommerceDetailOutputs(
  options: EcommerceDetailGenOptions,
): Promise<FileOutput[]> {
  if (!Array.isArray(options.pages) || options.pages.length === 0) {
    throw new Error('缺少详情页生成结果，请从「AI 电商详情页生成」工具页面填写产品信息后生成。');
  }

  const width = options.width || 1024;
  const height = options.height || 1536;
  const outputs: FileOutput[] = [];

  for (let i = 0; i < options.pages.length; i++) {
    const page = {
      ...options.pages[i],
      bullets: Array.isArray(options.pages[i].bullets) ? options.pages[i].bullets : [],
      hotspots: Array.isArray(options.pages[i].hotspots) ? options.pages[i].hotspots : [],
    };
    const blob = await renderDetailPage(page, {
      width,
      height,
      productName: options.productName,
    });
    const name = `${String(i + 1).padStart(2, '0')}_${page.type}.png`;
    outputs.push({
      blob,
      name,
      type: 'image/png',
      size: blob.size,
      url: URL.createObjectURL(blob),
    });
  }

  return outputs;
}

export async function processEcommerceDetailGen(
  _input: FileInput,
  options: ToolOptions,
): Promise<FileOutput> {
  const opts = options as EcommerceDetailGenOptions;
  const images = await renderEcommerceDetailOutputs(opts);
  const zip = new JSZip();

  images.forEach((image) => {
    zip.file(image.name, image.blob);
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return {
    blob: zipBlob,
    name: `${opts.productName || 'ecommerce-detail'}_detail_pages.zip`,
    type: 'application/zip',
    size: zipBlob.size,
    url: URL.createObjectURL(zipBlob),
  };
}
