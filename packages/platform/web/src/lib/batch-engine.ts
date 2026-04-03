import type { FileInput, FileOutput, ToolOptions, AtelierTool } from '@atelier/types';

export interface BatchResult {
  input: FileInput;
  output: FileOutput | null;
  error: string | null;
  status: 'success' | 'failed';
}

export type BatchPhase = 'idle' | 'preview' | 'executing' | 'review';

export async function runPreview(
  tool: AtelierTool,
  files: FileInput[],
  options: ToolOptions,
  count = 3,
): Promise<BatchResult[]> {
  const previewFiles = files.slice(0, Math.min(count, files.length));
  const results: BatchResult[] = [];

  for (const file of previewFiles) {
    try {
      const output = await tool.process(file, options);
      results.push({ input: file, output, error: null, status: 'success' });
    } catch (e) {
      results.push({ input: file, output: null, error: String(e), status: 'failed' });
    }
  }

  return results;
}

export async function runBatch(
  tool: AtelierTool,
  files: FileInput[],
  options: ToolOptions,
  onProgress: (completed: number, total: number, currentFile: string) => void,
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress(i, files.length, file.name);

    try {
      const output = await tool.process(file, options);
      results.push({ input: file, output, error: null, status: 'success' });
    } catch (e) {
      results.push({ input: file, output: null, error: String(e), status: 'failed' });
    }
  }

  onProgress(files.length, files.length, '');
  return results;
}

export async function retryFailed(
  tool: AtelierTool,
  failedResults: BatchResult[],
  options: ToolOptions,
  onProgress: (completed: number, total: number, currentFile: string) => void,
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];

  for (let i = 0; i < failedResults.length; i++) {
    const item = failedResults[i];
    onProgress(i, failedResults.length, item.input.name);

    try {
      const output = await tool.process(item.input, options);
      results.push({ input: item.input, output, error: null, status: 'success' });
    } catch (e) {
      results.push({ input: item.input, output: null, error: String(e), status: 'failed' });
    }
  }

  return results;
}
