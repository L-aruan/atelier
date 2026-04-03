import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { ImageFormatTool } from './ImageFormatTool';
import { processFormat } from './processor';

export const imageFormatTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: ImageFormatTool,
  process: processFormat,
};
