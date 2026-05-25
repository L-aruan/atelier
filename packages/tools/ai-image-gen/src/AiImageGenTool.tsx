import { useState, useCallback } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import type { ImageGenOptions } from './processor';

interface AiImageGenToolProps extends ToolProps {
  apiKey?: string | null;
  onNavigateToKeys?: () => void;
  callApi?: (params: {
    prompt: string;
    size?: string;
    quality?: string;
    n?: number;
    background?: string;
    apiKey?: string;
  }) => Promise<{ images: string[] }>;
}

const SIZE_OPTIONS = [
  { label: '1:1 方形', value: '1024x1024' as const },
  { label: '4:3 横版', value: '1536x1024' as const },
  { label: '3:4 竖版', value: '1024x1536' as const },
  { label: '自动', value: 'auto' as const },
];

const QUALITY_OPTIONS = [
  { label: '标准', value: 'auto' as const },
  { label: '低', value: 'low' as const },
  { label: '中', value: 'medium' as const },
  { label: '高', value: 'high' as const },
];

export function AiImageGenTool({
  onProcess,
  onDownload,
  processing,
  outputs,
  apiKey,
  onNavigateToKeys,
  callApi,
}: AiImageGenToolProps) {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1024x1024' | '1536x1024' | '1024x1536' | 'auto'>('1024x1024');
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'auto'>('auto');
  const [n, setN] = useState(1);

  const hasKey = !!apiKey;
  const hasOutput = outputs.length > 0;
  const canProcess = !!callApi && hasKey && prompt.trim().length > 0;

  const handleGenerate = useCallback(async () => {
    if (!callApi || !prompt.trim()) return;

    const options: ImageGenOptions = {
      prompt: prompt.trim(),
      size,
      quality,
      n,
      apiKey: apiKey || undefined,
      callApi,
    };

    // customLayout 工具直接调用 processor，传入空的 dummy FileInput
    const dummyInput = { file: new File([], 'prompt'), name: 'prompt', type: '', size: 0, url: '' };
    await onProcess([dummyInput], options);
  }, [callApi, prompt, size, quality, n, apiKey, onProcess]);

  return (
    <div className="space-y-6">
      {/* API Key 状态 */}
      <div
        className={`rounded-lg p-4 text-sm border ${
          hasKey ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={hasKey ? 'text-green-800' : 'text-amber-800 font-medium'}>
              {hasKey ? '已配置 OpenAI API Key' : '需要先添加 OpenAI API Key'}
            </p>
            <p className={`text-xs mt-1 ${hasKey ? 'text-green-600' : 'text-amber-600'}`}>
              {hasKey
                ? '使用 GPT-Image-1 模型生成图片，按量计费'
                : '前往设置添加 OpenAI Key 后即可使用'}
            </p>
          </div>
          {onNavigateToKeys && (
            <button
              onClick={onNavigateToKeys}
              className={`text-sm font-medium whitespace-nowrap ml-4 px-3 py-1.5 rounded-lg transition-colors ${
                hasKey
                  ? 'text-green-600 hover:text-green-800'
                  : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              {hasKey ? '管理 Key' : '去添加 Key →'}
            </button>
          )}
        </div>
      </div>

      {/* Prompt 输入 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          商品描述
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例如：白色运动鞋，纯白背景，电商产品图，高清细节，专业摄影风格"
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">
          描述越详细，生成效果越好。可包含风格、背景、光线等信息。
        </p>
      </div>

      {/* 参数设置 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">图片尺寸</label>
          <div className="flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSize(opt.value)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  size === opt.value
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">图片质量</label>
          <div className="flex flex-wrap gap-2">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setQuality(opt.value)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  quality === opt.value
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">生成数量</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => setN(num)}
                className={`w-10 h-9 text-sm rounded-lg border transition-colors ${
                  n === num
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 生成结果 */}
      {hasOutput && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {outputs.map((output) => (
            <div
              key={output.name}
              className="relative rounded-lg overflow-hidden border border-gray-200 group"
            >
              <div className="aspect-square bg-gray-50">
                {output.type === 'application/zip' ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <span className="text-3xl mb-2">📦</span>
                    <span className="text-xs">{output.name}</span>
                    <span className="text-xs text-gray-300">
                      {Math.round(output.size / 1024)} KB
                    </span>
                  </div>
                ) : (
                  <img
                    src={output.url}
                    alt={output.name}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <Button
          onClick={handleGenerate}
          disabled={processing || !canProcess}
          className="flex-1"
        >
          {processing
            ? '生成中...'
            : !canProcess
              ? '请先配置 API Key 并输入描述'
              : `生成 ${n} 张图片`}
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
