export interface RemoveBgOptions {
  apiKey?: string;
}

export interface RemoveBgResult {
  resultBase64: string;
  type: string;
}

export type RemoveBgCallFn = (
  imageBase64: string,
  apiKey?: string,
) => Promise<RemoveBgResult>;
