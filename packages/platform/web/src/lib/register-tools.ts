import { toolRegistry } from './tool-registry';
import { imageCompressTool } from '@atelier/tool-image-compress';
import { imageCropTool } from '@atelier/tool-image-crop';
import { imageFormatTool } from '@atelier/tool-image-format';
import { imagePlatformExportTool } from '@atelier/tool-image-platform-export';
import { imageResizeTool } from '@atelier/tool-image-resize';
import { imageWatermarkTool } from '@atelier/tool-image-watermark';
import { aiRemoveBgTool } from '@atelier/tool-ai-remove-bg';
import { aiImageGenTool } from '@atelier/tool-ai-image-gen';
import { aiCopyGenTool } from '@atelier/tool-ai-copy-gen';
import { aiSceneComposeTool } from '@atelier/tool-ai-scene-compose';
import { aiEcommerceDetailGenTool } from '@atelier/tool-ai-ecommerce-detail-gen';
import { docFormatBrushTool } from '@atelier/tool-doc-format-brush';
import { fileOrganizerTool } from '@atelier/tool-file-organizer';

export function registerAllTools() {
  toolRegistry.register(imageCropTool);
  toolRegistry.register(imageCompressTool);
  toolRegistry.register(imageFormatTool);
  toolRegistry.register(imagePlatformExportTool);
  toolRegistry.register(imageResizeTool);
  toolRegistry.register(imageWatermarkTool);
  toolRegistry.register(aiRemoveBgTool);
  toolRegistry.register(aiImageGenTool);
  toolRegistry.register(aiCopyGenTool);
  toolRegistry.register(aiSceneComposeTool);
  toolRegistry.register(aiEcommerceDetailGenTool);
  toolRegistry.register(fileOrganizerTool);
  toolRegistry.register(docFormatBrushTool);
}
