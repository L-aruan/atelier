'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ToolCard } from '@atelier/ui-kit';
import type { ToolManifest } from '@atelier/types';
import {
  getPinnedTools,
  togglePinTool,
  LOCAL_STORAGE_CHANGED,
} from '@/lib/pinned-store';
import { EmptyState } from '@/components/EmptyState';
import { ToolCardSkeleton } from '@/components/LoadingSkeleton';

interface ToolGridProps {
  tools: ToolManifest[];
  /** True while grid is not ready to show (e.g. post-hydration). */
  isLoading?: boolean;
  /** When tools are empty because of search, copy differs from empty category. */
  searchActive?: boolean;
}

export function ToolGrid({ tools, isLoading, searchActive }: ToolGridProps) {
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }, (_, i) => (
          <ToolCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (tools.length === 0) {
    if (searchActive) {
      return (
        <EmptyState
          icon="🔍"
          title="未找到相关工具"
          description="试试其他关键词，或切换分类浏览全部工具。"
        />
      );
    }
    return (
      <EmptyState
        icon="📂"
        title="该分类下暂无工具"
        description="请选择其他分类查看可用工具。"
      />
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
