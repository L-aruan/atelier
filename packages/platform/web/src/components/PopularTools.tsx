'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@atelier/ui-kit';
import type { ToolManifest } from '@atelier/types';
import { toolRegistry } from '@/lib/tool-registry';

const POPULAR_TOOL_IDS = [
  'ai-ecommerce-detail-gen',
  'ai-remove-bg',
  'ai-image-gen',
  'ai-copy-gen',
  'image-platform-export',
  'image-compress',
];

export function PopularTools() {
  const router = useRouter();
  const tools = POPULAR_TOOL_IDS
    .map((id) => toolRegistry.get(id)?.manifest)
    .filter((tool): tool is ToolManifest => Boolean(tool));

  if (tools.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">热门工具</h2>
          <p className="text-sm text-gray-500 mt-1">打开即用的单个工具，适合快速完成一个明确任务。</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <div key={tool.id} className="border border-gray-200 rounded-lg bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0" aria-hidden>
                {tool.icon}
              </span>
              <div className="min-w-0">
                <h3 className="font-medium text-gray-900">{tool.name}</h3>
                <p className="text-sm text-gray-500 mt-1 min-h-[40px]">{tool.description}</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-4"
              onClick={() => router.push(`/tool/${tool.id}`)}
            >
              打开工具
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
