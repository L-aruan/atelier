import { useState, useCallback, useRef } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import type { WatermarkMode, WatermarkPosition, WatermarkOptions } from './processor';

const POSITIONS: { value: WatermarkPosition; label: string }[] = [
  { value: 'top-left', label: '左上' },
  { value: 'top-right', label: '右上' },
  { value: 'center', label: '居中' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-right', label: '右下' },
];

const MODES: { value: WatermarkMode; label: string; desc: string }[] = [
  { value: 'text', label: '文字水印', desc: '自定义文字内容和样式' },
  { value: 'image', label: '图片水印', desc: '上传 logo 或水印图片' },
  { value: 'tiled', label: '平铺水印', desc: '全图平铺防盗模式' },
];

export function WatermarkTool({ files, onProcess, onDownload, processing, outputs }: ToolProps) {
  const [mode, setMode] = useState<WatermarkMode>('text');
  const [text, setText] = useState('© 版权所有');
  const [fontSize, setFontSize] = useState(32);
  const [fontColor, setFontColor] = useState('#ffffff');
  const [position, setPosition] = useState<WatermarkPosition>('bottom-right');
  const [opacity, setOpacity] = useState(0.5);
  const [rotation, setRotation] = useState(-30);
  const [padding, setPadding] = useState(20);
  const [scale, setScale] = useState(0.15);
  const [watermarkImage, setWatermarkImage] = useState<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const watermarkUrlRef = useRef<string | null>(null);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (watermarkUrlRef.current) URL.revokeObjectURL(watermarkUrlRef.current);
    const url = URL.createObjectURL(file);
    watermarkUrlRef.current = url;
    const img = new Image();
    img.onload = () => setWatermarkImage(img);
    img.src = url;
  }, []);

  const handleProcess = useCallback(async () => {
    const options: WatermarkOptions = {
      mode,
      text,
      fontSize,
      fontColor,
      position,
      opacity,
      rotation,
      padding,
      scale,
      watermarkImage: watermarkImage ?? undefined,
    };
    await onProcess(files, options);
  }, [files, onProcess, mode, text, fontSize, fontColor, position, opacity, rotation, padding, scale, watermarkImage]);

  const hasOutput = outputs.length > 0;

  return (
    <div className="space-y-6">
      {/* Mode selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">水印类型</label>
        <div className="grid grid-cols-3 gap-2">
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

      {/* Text options */}
      {(mode === 'text' || mode === 'tiled') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">水印文字</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="输入水印文字"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              字号 ({fontSize}px)
            </label>
            <input
              type="range"
              min="12"
              max="120"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">颜色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fontColor}
                onChange={(e) => setFontColor(e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <span className="text-sm text-gray-500">{fontColor}</span>
            </div>
          </div>
          {mode === 'tiled' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                旋转角度 ({rotation}°)
              </label>
              <input
                type="range"
                min="-90"
                max="90"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}

      {/* Image watermark options */}
      {mode === 'image' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">水印图片</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {watermarkImage ? '更换水印图片' : '选择水印图片'}
              </button>
              {watermarkImage && (
                <span className="text-sm text-green-600">
                  已加载 ({watermarkImage.width}×{watermarkImage.height})
                </span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              缩放比例 ({Math.round(scale * 100)}%)
            </label>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.01"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Common options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mode !== 'tiled' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as WatermarkPosition)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            透明度 ({Math.round(opacity * 100)}%)
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            边距 ({padding}px)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={padding}
            onChange={(e) => setPadding(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleProcess}
          disabled={processing || files.length === 0 || (mode === 'image' && !watermarkImage)}
          className="flex-1"
        >
          {processing ? '处理中...' : `添加水印 (${files.length} 张)`}
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
