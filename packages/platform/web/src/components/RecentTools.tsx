'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getRecentTools, LOCAL_STORAGE_CHANGED } from '@/lib/pinned-store';
import { toolRegistry } from '@/lib/tool-registry';

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export function RecentTools() {
  const [recent, setRecent] = useState<ReturnType<typeof getRecentTools>>([]);

  useEffect(() => {
    const load = () => setRecent(getRecentTools());
    load();
    window.addEventListener(LOCAL_STORAGE_CHANGED, load);
    return () => window.removeEventListener(LOCAL_STORAGE_CHANGED, load);
  }, []);

  if (recent.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
        🕐 最近使用
      </h3>
      <div className="space-y-1">
        {recent.slice(0, 5).map((entry) => {
          const tool = toolRegistry.get(entry.toolId);
          if (!tool) return null;
          return (
            <Link
              key={entry.toolId}
              href={`/tool/${entry.toolId}`}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>{tool.manifest.icon}</span>
                <span className="text-sm text-gray-700">{tool.manifest.name}</span>
                {entry.count > 1 && (
                  <span className="text-xs text-gray-400">× {entry.count}</span>
                )}
              </div>
              <span className="text-xs text-gray-400">{timeAgo(entry.lastUsed)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
