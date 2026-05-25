import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { AiCopyGenTool } from './AiCopyGenTool';
import { processCopyGen } from './processor';

export const aiCopyGenTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: AiCopyGenTool as AtelierTool['Component'],
  process: processCopyGen,
};

export { AiCopyGenTool } from './AiCopyGenTool';
export { processCopyGen } from './processor';
export type { CopyGenOptions } from './processor';
