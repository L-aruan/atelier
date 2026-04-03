import type { MediaBoxTool } from '@mediabox/types';
import manifest from '../manifest.json';
import { AiRemoveBgTool } from './AiRemoveBgTool';
import { processRemoveBg } from './processor';

export const aiRemoveBgTool: MediaBoxTool = {
  manifest: manifest as MediaBoxTool['manifest'],
  Component: AiRemoveBgTool as MediaBoxTool['Component'],
  process: processRemoveBg,
};

export { AiRemoveBgTool } from './AiRemoveBgTool';
export { processRemoveBg } from './processor';
export type { RemoveBgToolOptions } from './processor';
