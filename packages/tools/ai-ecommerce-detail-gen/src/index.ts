import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { AiEcommerceDetailGenTool } from './AiEcommerceDetailGenTool';
import { processEcommerceDetailGen } from './processor';

export const aiEcommerceDetailGenTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: AiEcommerceDetailGenTool as AtelierTool['Component'],
  process: processEcommerceDetailGen,
};

export { AiEcommerceDetailGenTool } from './AiEcommerceDetailGenTool';
export {
  processEcommerceDetailGen,
  renderEcommerceDetailOutput,
  renderEcommerceDetailOutputs,
} from './processor';
export type { EcommerceDetailGenOptions } from './processor';
export type {
  DetailPagePlan,
  EcommerceDetailRequest,
  EcommerceDetailResult,
  EcommerceProvider,
} from './types';
