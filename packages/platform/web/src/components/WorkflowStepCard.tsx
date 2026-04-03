'use client';

import type { WorkflowStep } from '@/lib/workflow-types';
import { toolRegistry } from '@/lib/tool-registry';
import type { ImageFormat } from '@atelier/engine-image';

interface WorkflowStepCardProps {
  step: WorkflowStep;
  index: number;
  totalSteps: number;
  onUpdate: (step: WorkflowStep) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const ASPECT_PRESETS = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '3:2', label: '3:2' },
  { value: 'free', label: '自由（整图）' },
];

const FORMAT_OPTIONS: { value: ImageFormat; label: string }[] = [
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/webp', label: 'WebP' },
];

export function WorkflowStepCard({
  step,
  index,
  totalSteps,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: WorkflowStepCardProps) {
  const tool = toolRegistry.get(step.toolId);
  const manifest = tool?.manifest;

  const patchOptions = (patch: Record<string, unknown>) => {
    onUpdate({ ...step, options: { ...step.options, ...patch } });
  };

  const renderControls = () => {
    switch (step.toolId) {
      case 'image-crop': {
        const aspectPreset = (step.options.aspectPreset as string) || '1:1';
        return (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600">裁剪比例</label>
            <div className="flex flex-wrap gap-2">
              {ASPECT_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => patchOptions({ aspectPreset: p.value })}
                  className={`px-2.5 py-1 text-xs rounded-lg border ${
                    aspectPreset === p.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        );
      }
      case 'image-compress': {
        const quality = typeof step.options.quality === 'number' ? step.options.quality : 0.8;
        const maxSizeMB = typeof step.options.maxSizeMB === 'number' ? step.options.maxSizeMB : 1;
        const maxWidthOrHeight =
          typeof step.options.maxWidthOrHeight === 'number' ? step.options.maxWidthOrHeight : 1920;
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                质量 {quality.toFixed(2)}
              </label>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => patchOptions({ quality: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">最大体积 (MB)</label>
              <input
                type="number"
                min={0.05}
                step={0.05}
                value={maxSizeMB}
                onChange={(e) => patchOptions({ maxSizeMB: parseFloat(e.target.value) || 1 })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">最大边长 (px)</label>
              <input
                type="number"
                min={64}
                step={64}
                value={maxWidthOrHeight}
                onChange={(e) => patchOptions({ maxWidthOrHeight: parseInt(e.target.value, 10) || 1920 })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm"
              />
            </div>
          </div>
        );
      }
      case 'image-format': {
        const targetFormat = (step.options.targetFormat as ImageFormat) || 'image/webp';
        const quality = typeof step.options.quality === 'number' ? step.options.quality : 0.92;
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">目标格式</label>
              <select
                value={targetFormat}
                onChange={(e) => patchOptions({ targetFormat: e.target.value as ImageFormat })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              >
                {FORMAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                质量 {quality.toFixed(2)}
              </label>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => patchOptions({ quality: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        );
      }
      case 'ai-remove-bg':
        return (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            此步骤需要配置 API Key。请在「设置 → API Key」中填写，执行时会自动调用。
          </p>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-semibold">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {manifest && <span className="text-xl">{manifest.icon}</span>}
            <span className="font-medium text-gray-900">{manifest?.name ?? step.toolId}</span>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">步骤名称</label>
            <input
              type="text"
              value={step.label}
              onChange={(e) => onUpdate({ ...step, label: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
          {renderControls()}
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"
            title="上移"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index >= totalSteps - 1}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"
            title="下移"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
            title="删除"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
