import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { AiSceneComposeTool } from './AiSceneComposeTool';
import { processSceneCompose } from './processor';

export const aiSceneComposeTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: AiSceneComposeTool as AtelierTool['Component'],
  process: processSceneCompose,
};

export { AiSceneComposeTool } from './AiSceneComposeTool';
export { processSceneCompose } from './processor';
export type { SceneComposeOptions } from './processor';
