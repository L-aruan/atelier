'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPinnedTools, LOCAL_STORAGE_CHANGED } from '@/lib/pinned-store';
import { toolRegistry } from '@/lib/tool-registry';

export function PinnedTools() {
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    const load = () => setPinnedIds(getPinnedTools());
    load();
    window.addEventListener(LOCAL_STORAGE_CHANGED, load);
    return () => window.removeEventListener(LOCAL_STORAGE_CHANGED, load);
  }, []);

  const pinnedTools = pinnedIds
    .map((id) => toolRegistry.get(id))
    .filter(Boolean);

  if (pinnedTools.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
        📌 我的常用
      </h3>
      <div className="flex gap-2 flex-wrap">
        {pinnedTools.map((tool) => (
          <Link
            key={tool!.manifest.id}
            href={`/tool/${tool!.manifest.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            <span>{tool!.manifest.icon}</span>
            <span>{tool!.manifest.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
