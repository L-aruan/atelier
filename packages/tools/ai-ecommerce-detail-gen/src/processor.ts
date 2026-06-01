import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';
import { renderDetailPage } from './renderer';
import type { DetailPagePlan } from './types';

export interface EcommerceDetailGenOptions extends ToolOptions {
  productName: string;
  pages: DetailPagePlan[];
  width?: number;
  height?: number;
}

export async function renderEcommerceDetailOutput(params: {
  productName: string;
  page: DetailPagePlan;
  index?: number;
  width?: number;
  height?: number;
}): Promise<FileOutput> {
  const page = {
    ...params.page,
    bullets: Array.isArray(params.page.bullets) ? params.page.bullets : [],
    hotspots: Array.isArray(params.page.hotspots) ? params.page.hotspots : [],
  };
  const blob = await renderDetailPage(page, {
    width: params.width || 1024,
    height: params.height || 1536,
    productName: params.productName,
  });
  const prefix =
    params.index === undefined ? '' : `${String(params.index + 1).padStart(2, '0')}_`;

  return {
    blob,
    name: `${prefix}${page.type}.png`,
    type: 'image/png',
    size: blob.size,
    url: URL.createObjectURL(blob),
  };
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
    outputs.push(
      await renderEcommerceDetailOutput({
        productName: options.productName,
        page: options.pages[i],
        index: i,
        width,
        height,
      }),
    );
  }

  return outputs;
}

export async function processEcommerceDetailGen(
  _input: FileInput,
  options: ToolOptions,
): Promise<FileOutput> {
  const opts = options as EcommerceDetailGenOptions;
  if (!Array.isArray(opts.pages) || opts.pages.length === 0) {
    throw new Error('缺少详情页生成结果，请从「AI 电商详情页生成」工具页面填写产品信息后生成。');
  }

  if (opts.pages.length > 1) {
    throw new Error('多页详情图请使用工具页面生成结果中的服务端 ZIP 下载，避免浏览器内存占用过高。');
  }

  const output = await renderEcommerceDetailOutput({
    productName: opts.productName,
    page: opts.pages[0],
    width: opts.width || 1024,
    height: opts.height || 1536,
  });

  return {
    ...output,
    name: `${opts.productName || 'ecommerce-detail'}_${opts.pages[0].type}.png`,
  };
}
