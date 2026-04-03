import { useState, useCallback } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import type { CompressToolOptions } from './processor';

export function ImageCompressTool({ files, onProcess, onDownload, processing, outputs }: ToolProps) {
  const [quality, setQuality] = useState(0.8);
  const [maxSizeMB, setMaxSizeMB] = useState(1);
  const [maxDimension, setMaxDimension] = useState(1920);

  const handleCompress = useCallback(async () => {
    const options: CompressToolOptions = { quality, maxSizeMB, maxWidthOrHeight: maxDimension };
    await onProcess(files, options);
  }, [files, onProcess, quality, maxSizeMB, maxDimension]);

  const totalInputSize = files.reduce((s, f) => s + f.size, 0);
  const totalOutputSize = outputs.reduce((s, f) => s + f.size, 0);
  const hasOutput = outputs.length > 0;
  const savingsPercent =
    totalInputSize > 0 ? Math.round((1 - totalOutputSize / totalInputSize) * 100) : 0;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            质量 ({Math.round(quality * 100)}%)
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">最大体积 (MB)</label>
          <input
            type="number"
            min="0.1"
            max="50"
            step="0.1"
            value={maxSizeMB}
            onChange={(e) => setMaxSizeMB(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">最大宽高 (px)</label>
          <input
            type="number"
            min="100"
            max="10000"
            step="100"
            value={maxDimension}
            onChange={(e) => setMaxDimension(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {hasOutput && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-gray-600">
              压缩前: <strong>{formatSize(totalInputSize)}</strong>
            </span>
            <span className="text-green-600">
              压缩后: <strong>{formatSize(totalOutputSize)}</strong>
            </span>
            <span className="text-green-700 font-bold">节省 {savingsPercent}%</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={handleCompress} disabled={processing || files.length === 0} className="flex-1">
          {processing ? '压缩中...' : `压缩 ${files.length} 张图片`}
        </Button>
        {hasOutput && (
          <Button variant="secondary" onClick={() => onDownload(outputs)}>
            下载结果
          </Button>
        )}
      </div>
    </div>
  );
}
