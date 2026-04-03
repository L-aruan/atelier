'use client';
import type { BatchResult } from '@/lib/batch-engine';
import { CompareSlider } from './CompareSlider';
import { Button } from '@mediabox/ui-kit';

interface BatchPreviewProps {
  results: BatchResult[];
  totalFiles: number;
  onConfirm: () => void;
  onAdjust: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BatchPreview({ results, totalFiles, onConfirm, onAdjust }: BatchPreviewProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <span className="text-lg">⚡</span>
        <span>
          已用前 <strong>{results.length}</strong> 张图片试运行，请确认效果后再处理全部
          <strong> {totalFiles}</strong> 张
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {results.map((r) => (
          <div
            key={r.input.name}
            className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200"
          >
            {r.status === 'success' && r.output ? (
              <>
                <CompareSlider beforeUrl={r.input.url} afterUrl={r.output.url} />
                <div className="p-3 text-xs text-gray-500 flex justify-between">
                  <span className="truncate flex-1">{r.input.name}</span>
                  <span className="ml-2 whitespace-nowrap text-gray-400">
                    {formatSize(r.input.size)} → {formatSize(r.output.size)}
                  </span>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-red-500 text-sm">
                <div className="text-3xl mb-2">❌</div>
                <p className="font-medium">{r.input.name}</p>
                <p className="text-xs mt-1 text-red-400">{r.error}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-center pt-2">
        <Button onClick={onConfirm}>
          ✓ 效果满意，处理全部 {totalFiles} 张
        </Button>
        <Button variant="secondary" onClick={onAdjust}>
          调整参数重试
        </Button>
      </div>
    </div>
  );
}
