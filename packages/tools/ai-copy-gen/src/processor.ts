import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export interface CopyGenOptions extends ToolOptions {
  productName: string;
  sellingPoints: string;
  platform?: 'taobao' | 'douyin' | 'xiaohongshu' | 'pdd' | 'general';
  style?: 'professional' | 'casual' | 'luxury' | 'youthful';
  apiKey?: string;
  callApi: (params: {
    productName: string;
    sellingPoints: string;
    platform?: string;
    style?: string;
    apiKey?: string;
  }) => Promise<{ title: string; description: string; tags: string[] }>;
}

function formatCopy(result: { title: string; description: string; tags: string[] }): string {
  const lines: string[] = [];
  lines.push(`【标题】${result.title}`);
  lines.push('');
  lines.push('【详情文案】');
  lines.push(result.description);
  lines.push('');
  lines.push(`【关键词标签】${result.tags.join('、')}`);
  return lines.join('\n');
}

export async function processCopyGen(
  _input: FileInput,
  options: ToolOptions,
): Promise<FileOutput> {
  const opts = options as CopyGenOptions;
  const result = await opts.callApi({
    productName: opts.productName,
    sellingPoints: opts.sellingPoints,
    platform: opts.platform,
    style: opts.style,
    apiKey: opts.apiKey,
  });

  const text = formatCopy(result);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  return {
    blob,
    name: `文案_${opts.productName}.txt`,
    type: 'text/plain',
    size: blob.size,
    url: URL.createObjectURL(blob),
  };
}
