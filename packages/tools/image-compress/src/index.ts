import type { MediaBoxTool } from '@mediabox/types';
import manifest from '../manifest.json';
import { ImageCompressTool } from './ImageCompressTool';
import { processCompress } from './processor';

export const imageCompressTool: MediaBoxTool = {
  manifest: manifest as MediaBoxTool['manifest'],
  Component: ImageCompressTool,
  process: processCompress,
};
