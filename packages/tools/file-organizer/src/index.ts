import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { FileOrganizerTool } from './FileOrganizerTool';
import { processFileOrganizer } from './processor';

export const fileOrganizerTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: FileOrganizerTool as AtelierTool['Component'],
  process: processFileOrganizer,
};
