export type ToolCategory = 'image' | 'video' | 'design' | 'audio' | 'document' | 'ai';

export interface ToolRuntime {
  client: boolean;
  server: boolean;
  offline: boolean;
  downloadable: boolean;
}

export interface ToolInput {
  accept: string[];
  maxSize: string;
  batch: boolean;
}

export interface ToolOutput {
  formats: string[];
}

export interface ToolManifest {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  icon: string;
  version: string;
  runtime: ToolRuntime;
  input: ToolInput;
  output: ToolOutput;
  engine: string;
  component: string;
}
