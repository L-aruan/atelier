import { useState, useCallback } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import type { ImageFormat } from '@atelier/engine-image';
import type { FormatToolOptions } from './processor';

const FORMATS: { label: string; value: ImageFormat }[] = [
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
  { label: 'WebP', value: 'image/webp' },
];

function mimeLabel(mime: string) {
  const part = mime.split('/')[1];
  return part ? part.toUpperCase() : mime;
}

export function ImageFormatTool({ files, onProcess, onDownload, processing, outputs }: ToolProps) {
  const [targetFormat, setTargetFormat] = useState<ImageFormat>('image/webp');
  const [quality, setQuality] = useState(0.92);
  const hasOutput = outputs.length > 0;

  const handleConvert = useCallback(async () => {
    const options: FormatToolOptions = { targetFormat, quality };
    await onProcess(files, options);
  }, [files, onProcess, targetFormat, quality]);

  const sampleInputType = files[0]?.type;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">目标格式</label>
          <div className="flex gap-2 flex-wrap">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setTargetFormat(f.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  targetFormat === f.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {sampleInputType && (
            <p className="text-xs text-gray-500 mt-2">
              格式对比（首张）: <span className="font-medium">{mimeLabel(sampleInputType)}</span>
              {' → '}
              <span className="font-medium text-blue-600">{mimeLabel(targetFormat)}</span>
            </p>
          )}
        </div>
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
          <p className="text-xs text-gray-400 mt-1">PNG 格式忽略此参数</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleConvert} disabled={processing || files.length === 0} className="flex-1">
          {processing
            ? '转换中...'
            : `转换 ${files.length} 张图片为 ${targetFormat.split('/')[1].toUpperCase()}`}
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
