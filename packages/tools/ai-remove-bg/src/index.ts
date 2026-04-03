import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { AiRemoveBgTool } from './AiRemoveBgTool';
import { processRemoveBg } from './processor';

export const aiRemoveBgTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: AiRemoveBgTool as AtelierTool['Component'],
  process: processRemoveBg,
};

export { AiRemoveBgTool } from './AiRemoveBgTool';
export { processRemoveBg } from './processor';
export type { RemoveBgToolOptions } from './processor';
