import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { ImageCropTool } from './ImageCropTool';
import { processCrop } from './processor';

export const imageCropTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: ImageCropTool,
  process: processCrop,
};
