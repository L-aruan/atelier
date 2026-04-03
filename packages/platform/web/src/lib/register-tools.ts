import { toolRegistry } from './tool-registry';
import { imageCropTool } from '@mediabox/tool-image-crop';

export function registerAllTools() {
  toolRegistry.register(imageCropTool);
}
