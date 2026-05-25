import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { PlatformExportTool } from './PlatformExportTool';
import { processPlatformExport } from './processor';
export { EXPORT_BUNDLES, EXPORT_PRESETS } from './processor';
export type { PlatformExportOptions } from './processor';

export const imagePlatformExportTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: PlatformExportTool,
  process: processPlatformExport,
};
