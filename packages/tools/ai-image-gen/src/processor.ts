import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';
import JSZip from 'jszip';

export interface ImageGenOptions extends ToolOptions {
  prompt: string;
  size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
  quality?: 'low' | 'medium' | 'high' | 'auto';
  n?: number;
  background?: 'transparent' | 'opaque' | 'auto';
  apiKey?: string;
  callApi: (params: {
    prompt: string;
    size?: string;
    quality?: string;
    n?: number;
    background?: string;
    apiKey?: string;
  }) => Promise<{ images: string[] }>;
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}

export async function processImageGen(
  _input: FileInput,
  options: ToolOptions,
): Promise<FileOutput> {
  const opts = options as ImageGenOptions;
  const result = await opts.callApi({
    prompt: opts.prompt,
    size: opts.size,
    quality: opts.quality,
    n: opts.n,
    background: opts.background,
    apiKey: opts.apiKey,
  });

  if (result.images.length === 1) {
    const blob = base64ToBlob(result.images[0], 'image/png');
    return {
      blob,
      name: 'ai-generated.png',
      type: 'image/png',
      size: blob.size,
      url: URL.createObjectURL(blob),
    };
  }

  const zip = new JSZip();
  result.images.forEach((b64, i) => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let j = 0; j < binary.length; j++) {
      bytes[j] = binary.charCodeAt(j);
    }
    zip.file(`ai-generated-${i + 1}.png`, bytes);
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return {
    blob: zipBlob,
    name: 'ai-generated.zip',
    type: 'application/zip',
    size: zipBlob.size,
    url: URL.createObjectURL(zipBlob),
  };
}
