'use client';
import { useRouter } from 'next/navigation';
import { ToolCard } from '@mediabox/ui-kit';
import type { ToolManifest } from '@mediabox/types';

interface ToolGridProps {
  tools: ToolManifest[];
}

export function ToolGrid({ tools }: ToolGridProps) {
  const router = useRouter();

  if (tools.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-3">🔍</div>
        <p>该分类下暂无工具</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {tools.map((manifest) => (
        <ToolCard
          key={manifest.id}
          manifest={manifest}
          onClick={() => router.push(`/tool/${manifest.id}`)}
        />
      ))}
    </div>
  );
}
