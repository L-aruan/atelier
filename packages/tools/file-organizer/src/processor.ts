import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export async function processFileOrganizer(_input: FileInput, _options: ToolOptions): Promise<FileOutput> {
  throw new Error('File organizer uses custom layout with direct ZIP output');
}
