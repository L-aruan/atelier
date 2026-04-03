import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export async function processDocFormatBrush(input: FileInput, options: ToolOptions): Promise<FileOutput> {
  void input;
  void options;
  throw new Error('Doc format brush requires server-side processing via tRPC');
}
