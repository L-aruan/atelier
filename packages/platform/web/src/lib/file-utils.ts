import type { FileInput } from '@mediabox/types';

export function filesToFileInputs(files: File[]): FileInput[] {
  return files.map((file) => ({
    file,
    name: file.name,
    type: file.type,
    size: file.size,
    url: URL.createObjectURL(file),
  }));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'document';
  return 'other';
}
