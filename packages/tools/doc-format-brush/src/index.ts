import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { DocFormatBrushTool } from './DocFormatBrushTool';
import { processDocFormatBrush } from './processor';

export const docFormatBrushTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: DocFormatBrushTool as AtelierTool['Component'],
  process: processDocFormatBrush,
};

export { loadDocxInfo, applyFormat } from './engine';
export type { FormatOptions, DocInfo, StyleInfo } from './engine';
