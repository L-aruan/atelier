'use client';

interface BatchProgressProps {
  completed: number;
  total: number;
  failed: number;
  currentFile: string;
}

export function BatchProgress({ completed, total, failed, currentFile }: BatchProgressProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4 p-6">
      <div className="text-center">
        <div className="text-4xl font-bold text-blue-600 mb-1">{percent}%</div>
        <p className="text-sm text-gray-500">
          {completed === total ? '处理完成' : '正在批量处理...'}
        </p>
      </div>

      <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-green-500 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between text-sm text-gray-600">
        <span>
          进度: <span className="font-semibold text-gray-900">{completed}</span> / {total}
        </span>
        {failed > 0 && (
          <span className="text-red-500">
            {failed} 个失败
          </span>
        )}
      </div>

      {currentFile && (
        <p className="text-xs text-gray-400 truncate text-center">
          正在处理: {currentFile}
        </p>
      )}
    </div>
  );
}
