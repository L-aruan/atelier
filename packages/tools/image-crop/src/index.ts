import type { MediaBoxTool } from '@mediabox/types';
import manifest from '../manifest.json';
import { ImageCropTool } from './ImageCropTool';
import { processCrop } from './processor';

export const imageCropTool: MediaBoxTool = {
  manifest: manifest as MediaBoxTool['manifest'],
  Component: ImageCropTool,
  process: processCrop,
};
