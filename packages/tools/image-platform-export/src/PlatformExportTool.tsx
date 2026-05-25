import { useMemo, useState } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import { EXPORT_BUNDLES, EXPORT_PRESETS, type PlatformExportOptions } from './processor';

export function PlatformExportTool({
  files,
  onProcess,
  onDownload,
  processing,
  outputs,
}: ToolProps) {
  const [bundleId, setBundleId] = useState<string>('ecommerce');
  const [mode, setMode] = useState<'fill' | 'fit'>('fill');
  const [outputFormat, setOutputFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>(
    'image/jpeg',
  );
  const [quality, setQuality] = useState(0.9);

  const selectedBundle = EXPORT_BUNDLES.find((b) => b.id === bundleId) ?? EXPORT_BUNDLES[0];
  const selectedPresets = useMemo(
    () => EXPORT_PRESETS.filter((p) => selectedBundle.presetIds.includes(p.id)),
    [selectedBundle],
  );

  const handleExport = async () => {
    const options: PlatformExportOptions = {
      presetIds: selectedBundle.presetIds,
      mode,
      outputFormat,
      quality,
      backgroundColor: '#ffffff',
    };
    await onProcess(files, options);
  };

  if (files.length === 0) {
    return <div className="py-10 text-center text-sm text-gray-500">请先上传图片</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {selectedPresets.map((preset) => (
            <div key={preset.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="text-sm font-medium text-gray-900">{preset.label}</div>
              <div className="text-xs text-gray-500 mt-1">
                {preset.width} x {preset.height}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          每张原图会导出一个 ZIP，内部按平台分目录保存，适合商品图上架和多渠道分发。
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">导出包</label>
          <select
            value={bundleId}
            onChange={(e) => setBundleId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {EXPORT_BUNDLES.map((bundle) => (
              <option key={bundle.id} value={bundle.id}>
                {bundle.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">适配方式</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'fill', label: '铺满裁切' },
              { id: 'fit', label: '完整留白' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id as 'fill' | 'fit')}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  mode === item.id
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">输出格式</label>
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as typeof outputFormat)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
            <option value="image/webp">WebP</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            质量 {quality.toFixed(2)}
          </label>
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.05}
            value={quality}
            onChange={(e) => setQuality(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <Button type="button" onClick={handleExport} disabled={processing} className="w-full">
          {processing ? '导出中...' : `导出 ${files.length} 张图片`}
        </Button>
        {outputs.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => onDownload(outputs)}
            className="w-full"
          >
            下载 ZIP
          </Button>
        )}
      </div>
    </div>
  );
}
