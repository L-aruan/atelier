import type { ToolManifest, MediaBoxTool } from '@mediabox/types';

class ToolRegistry {
  private tools = new Map<string, MediaBoxTool>();

  register(tool: MediaBoxTool) {
    this.tools.set(tool.manifest.id, tool);
  }

  get(id: string): MediaBoxTool | undefined {
    return this.tools.get(id);
  }

  getAll(): MediaBoxTool[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: string): MediaBoxTool[] {
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
