import { toolRegistry } from './tool-registry';
import { imageCompressTool } from '@mediabox/tool-image-compress';
import { imageCropTool } from '@mediabox/tool-image-crop';
import { imageFormatTool } from '@mediabox/tool-image-format';

export function registerAllTools() {
  toolRegistry.register(imageCropTool);
  toolRegistry.register(imageCompressTool);
  toolRegistry.register(imageFormatTool);
}
