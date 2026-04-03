mport imageCompression from 'browser-image-compression';

export interface CompressOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: options.maxSizeMB ?? 1,
    maxWidthOrHeight: options.maxWidthOrHeight ?? 1920,
    initialQuality: options.quality ?? 0.8,
    useWebWorker: true,
  });
}
