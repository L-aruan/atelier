import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { ImageCompressTool } from './ImageCompressTool';
import { processCompress } from './processor';

export const imageCompressTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: ImageCompressTool,
  process: processCompress,
};
