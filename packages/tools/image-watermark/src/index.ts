import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { WatermarkTool } from './WatermarkTool';
import { processWatermark } from './processor';

export const imageWatermarkTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: WatermarkTool,
  process: processWatermark,
};
