import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { AiImageGenTool } from './AiImageGenTool';
import { processImageGen } from './processor';

export const aiImageGenTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: AiImageGenTool as AtelierTool['Component'],
  process: processImageGen,
};

export { AiImageGenTool } from './AiImageGenTool';
export { processImageGen } from './processor';
export type { ImageGenOptions } from './processor';
