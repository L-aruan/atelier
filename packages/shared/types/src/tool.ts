import type { ComponentType } from 'react';
import type { ToolManifest } from './manifest';
import type { FileInput, FileOutput } from './file';

export interface ToolOptions {
  [key: string]: unknown;
}

export interface ToolProps {
  files: FileInput[];
  onProcess: (files: FileInput[], options: ToolOptions) => Promise<FileOutput[]>;
  onDownload: (outputs: FileOutput[]) => void;
  processing: boolean;
  outputs: FileOutput[];
}

export interface MediaBoxTool {
  manifest: ToolManifest;
  Component: ComponentType<ToolProps>;
  process: (input: FileInput, options: ToolOptions) => Promise<FileOutput>;
}
