'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ToolCard } from '@mediabox/ui-kit';
import type { ToolManifest } from '@mediabox/types';
import {
  getPinnedTools,
  togglePinTool,
  LOCAL_STORAGE_CHANGED,
} from '@/lib/pinned-store';

interface ToolGridProps {
  tools: ToolManifest[];
}

export function ToolGrid({ tools }: ToolGridProps) {
  const router = useRouter();
  const [pinnedSet, setPinnedSet] = useState<Set<string>>(() => new Set());

  const syncPins = useCallback(() => {
    setPinnedSet(new Set(getPinnedTools()));
  }, []);

  useEffect(() => {
    syncPins();
    window.addEventListener(LOCAL_STORAGE_CHANGED, syncPins);
    return () => window.removeEventListener(LOCAL_STORAGE_CHANGED, syncPins);
  }, [syncPins]);

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
        <div key={manifest.id} className="relative group">
          <ToolCard
            manifest={manifest}
            onClick={() => router.push(`/tool/${manifest.id}`)}
            className="h-full"
          />
          <button
            type="button"
            aria-label={pinnedSet.has(manifest.id) ? '取消钉选' : '钉选到常用'}
            title={pinnedSet.has(manifest.id) ? '取消钉选' : '钉选到常用'}
            onClick={(e) => {
              e.stopPropagation();
              togglePinTool(manifest.id);
            }}
            className={`absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-sm shadow-sm transition-opacity hover:bg-gray-50 ${
              pinnedSet.has(manifest.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {pinnedSet.has(manifest.id) ? '📌' : '📍'}
          </button>
        </div>
      ))}
    </div>
  );
}
