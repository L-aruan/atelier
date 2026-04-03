import type { ToolManifest, AtelierTool } from '@atelier/types';

class ToolRegistry {
  private tools = new Map<string, AtelierTool>();

  register(tool: AtelierTool) {
    this.tools.set(tool.manifest.id, tool);
  }

  get(id: string): AtelierTool | undefined {
    return this.tools.get(id);
  }

  getAll(): AtelierTool[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: string): AtelierTool[] {
    if (category === 'all') return this.getAll();
    return this.getAll().filter((t) => t.manifest.category === category);
  }

  getManifests(): ToolManifest[] {
    return this.getAll().map((t) => t.manifest);
  }

  getForFileType(mimeType: string): ToolManifest[] {
    return this.getManifests().filter((m) =>
      m.input.accept.some((a) => {
        if (a.endsWith('/*')) return mimeType.startsWith(a.replace('/*', '/'));
        return mimeType === a;
      }),
    );
  }
}

export const toolRegistry = new ToolRegistry();
