import { useState, useCallback } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import type { ResizeMode, ResizeToolOptions } from './processor';

const MODES: { value: ResizeMode; label: string; desc: string }[] = [
  { value: 'exact', label: '指定尺寸', desc: '精确设置宽高像素' },
  { value: 'percentage', label: '百分比', desc: '按比例缩放' },
  { value: 'fit', label: '适应', desc: '缩放适应目标区域，不变形' },
  { value: 'fill', label: '填充', desc: '缩放填满目标区域，裁剪多余' },
];

export function ResizeTool({ files, onProcess, onDownload, processing, outputs }: ToolProps) {
  const [mode, setMode] = useState<ResizeMode>('exact');
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [keepRatio, setKeepRatio] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  const handleProcess = useCallback(async () => {
    const options: ResizeToolOptions = {
      width,
      height,
      mode,
      keepRatio,
      backgroundColor: mode === 'fit' || mode === 'fill' ? backgroundColor : undefined,
    };
    await onProcess(files, options);
  }, [files, onProcess, mode, width, height, keepRatio, backgroundColor]);

  const hasOutput = outputs.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">调整模式</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                mode === m.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{m.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {mode === 'percentage' ? '缩放比例 (%)' : '宽度 (px)'}
          </label>
          <input
            type="number"
            min={mode === 'percentage' ? 1 : 1}
            max={mode === 'percentage' ? 500 : 10000}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {mode !== 'percentage' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">高度 (px)</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {mode === 'exact' && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={keepRatio}
            onChange={(e) => setKeepRatio(e.target.checked)}
            className="rounded border-gray-300"
          />
          保持原始比例
        </label>
      )}

      {(mode === 'fit' || mode === 'fill') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">背景颜色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-10 h-10 rounded border cursor-pointer"
            />
            <span className="text-sm text-gray-500">{backgroundColor}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={handleProcess} disabled={processing || files.length === 0} className="flex-1">
          {processing ? '处理中...' : `调整尺寸 (${files.length} 张)`}
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
