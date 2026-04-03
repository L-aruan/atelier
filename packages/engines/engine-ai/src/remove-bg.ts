import type { RemoveBgCallFn, RemoveBgOptions } from './types';

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

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}

export function createRemoveBgProcessor(callApi: RemoveBgCallFn) {
  return async function removeBg(file: File, options?: RemoveBgOptions): Promise<Blob> {
    const base64 = await fileToBase64(file);
    const result = await callApi(base64, options?.apiKey);
    return base64ToBlob(result.resultBase64, result.type);
  };
}
