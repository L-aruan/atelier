import type { FileOutput } from '@atelier/types';

export async function processFileOrganizer(): Promise<FileOutput> {
  throw new Error('File organizer uses custom layout with direct ZIP output');
}
