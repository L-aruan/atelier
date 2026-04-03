import { toolRegistry } from './tool-registry';
import { imageCompressTool } from '@atelier/tool-image-compress';
import { imageCropTool } from '@atelier/tool-image-crop';
import { imageFormatTool } from '@atelier/tool-image-format';
import { aiRemoveBgTool } from '@atelier/tool-ai-remove-bg';
import { docFormatBrushTool } from '@atelier/tool-doc-format-brush';
import { fileOrganizerTool } from '@atelier/tool-file-organizer';

export function registerAllTools() {
  toolRegistry.register(imageCropTool);
  toolRegistry.register(imageCompressTool);
  toolRegistry.register(imageFormatTool);
  toolRegistry.register(aiRemoveBgTool);
  toolRegistry.register(fileOrganizerTool);
  toolRegistry.register(docFormatBrushTool);
}
