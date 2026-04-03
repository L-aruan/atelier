export interface FileInput {
  file: File;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface FileOutput {
  blob: Blob;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  current: string | null;
}
