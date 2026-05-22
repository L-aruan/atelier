import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { ResizeTool } from './ResizeTool';
import { processResize } from './processor';

export const imageResizeTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: ResizeTool,
  process: processResize,
};
