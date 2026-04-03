import type { MediaBoxTool } from '@mediabox/types';
import manifest from '../manifest.json';
import { ImageFormatTool } from './ImageFormatTool';
import { processFormat } from './processor';

export const imageFormatTool: MediaBoxTool = {
  manifest: manifest as MediaBoxTool['manifest'],
  Component: ImageFormatTool,
  process: processFormat,
};
