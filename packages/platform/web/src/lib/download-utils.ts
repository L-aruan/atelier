import JSZip from 'jszip';
import type { FileOutput } from '@atelier/types';

export function downloadSingle(output: FileOutput) {
  const a = document.createElement('a');
  a.href = output.url;
  a.download = output.name;
  a.click();
}

export async function downloadAsZip(outputs: FileOutput[], zipName = 'atelier-output.zip') {
  const zip = new JSZip();
  for (const output of outputs) {
    zip.file(output.name, output.blob);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  a.click();
  URL.revokeObjectURL(url);
}
