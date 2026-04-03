import type { FileInput, FileOutput, ToolOptions } from '@mediabox/types';

export interface RemoveBgToolOptions extends ToolOptions {
  apiKey?: string;
  callApi: (
    imageBase64: string,
    apiKey?: string,
  ) => Promise<{ resultBase64: string; type: string }>;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function processRemoveBg(
  input: FileInput,
  options: ToolOptions,
): Promise<FileOutput> {
  const opts = options as RemoveBgToolOptions;
  const base64 = await fileToBase64(input.file);
  const result = await opts.callApi(base64, opts.apiKey);

  const binary = atob(result.resultBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: result.type });

  const baseName = input.name.replace(/\.[^.]+$/, '');
  return {
    blob,
    name: `${baseName}_nobg.png`,
    type: 'image/png',
    size: blob.size,
    url: URL.createObjectURL(blob),
  };
}
