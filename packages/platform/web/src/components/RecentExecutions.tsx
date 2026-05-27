'use client';

import { trpc } from '@/lib/trpc-client';
import { useAuth } from '@/lib/auth-context';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds}秒`;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function statusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">完成</span>;
    case 'partial':
      return <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">部分成功</span>;
    case 'failed':
      return <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">失败</span>;
    default:
      return <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">{status}</span>;
  }
}

export function RecentExecutions() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.execution.list.useQuery(
    { limit: 5 },
    { enabled: !!user },
  );

  if (!user || isLoading || !data?.runs.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">最近执行</h2>
        <p className="text-sm text-gray-500 mt-1">查看最近的工作流执行记录。</p>
      </div>
      <div className="space-y-3">
        {data.runs.map((run) => (
          <div
            key={run.id}
            className="border border-gray-200 rounded-lg bg-white p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900 text-sm">{run.workflowName}</h3>
              {statusBadge(run.status)}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{run.totalFiles} 个文件</span>
              <span>
                成功 {run.successCount}
                {run.failCount > 0 && <span className="text-red-500"> · 失败 {run.failCount}</span>}
              </span>
              <span>{formatDuration(run.duration)}</span>
              <span>{formatTimeAgo(new Date(run.createdAt))}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
