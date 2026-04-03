import { useState, useCallback } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import type { RemoveBgToolOptions } from './processor';

interface AiRemoveBgToolProps extends ToolProps {
  apiKey?: string | null;
  onNavigateToKeys?: () => void;
  callApi?: (imageBase64: string, apiKey?: string) => Promise<{ resultBase64: string; type: string }>;
}

const CHECKERBOARD = [
  'linear-gradient(45deg, #e0e0e0 25%, transparent 25%)',
  'linear-gradient(-45deg, #e0e0e0 25%, transparent 25%)',
  'linear-gradient(45deg, transparent 75%, #e0e0e0 75%)',
  'linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)',
].join(', ');

export function AiRemoveBgTool({
  files,
  onProcess,
  onDownload,
  processing,
  outputs,
  apiKey,
  onNavigateToKeys,
  callApi,
}: AiRemoveBgToolProps) {
  const [useOwnKey, setUseOwnKey] = useState(true);
  const hasKey = !!apiKey;
  const hasOutput = outputs.length > 0;

  const canProcess = !!callApi && (hasKey || !useOwnKey);

  const handleRemoveBg = useCallback(async () => {
    if (!callApi) return;
    const key = useOwnKey ? apiKey || undefined : undefined;
    const options: RemoveBgToolOptions = { apiKey: key, callApi };
    await onProcess(files, options);
  }, [files, onProcess, useOwnKey, apiKey, callApi]);

  return (
    <div className="space-y-6">
      <div className={`rounded-lg p-4 text-sm border ${hasKey ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={hasKey ? 'text-green-800' : 'text-amber-800 font-medium'}>
              {hasKey ? '✓ 已配置 remove.bg API Key' : '⚠ 需要先添加 remove.bg API Key'}
            </p>
            <p className={`text-xs mt-1 ${hasKey ? 'text-green-600' : 'text-amber-600'}`}>
              {hasKey
                ? '使用你的 Key 可获得更好的配额'
                : '前往设置添加 Key 后即可使用，免费 Key 每月可处理 50 张图'}
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

      {hasKey && (
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={useOwnKey}
              onChange={() => setUseOwnKey(true)}
            />
            <span>使用我的 Key</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!useOwnKey}
              onChange={() => setUseOwnKey(false)}
            />
            <span>使用平台 Key（较慢）</span>
          </label>
        </div>
      )}

      {hasOutput && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {outputs.map((output, i) => (
            <div
              key={output.name}
              className="relative rounded-lg overflow-hidden border border-gray-200"
            >
              <div
                className="aspect-square"
                style={{
                  backgroundImage: CHECKERBOARD,
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              >
                <img
                  src={output.url}
                  alt={output.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1.5 truncate">
                {files[i]?.name || output.name}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleRemoveBg}
          disabled={processing || files.length === 0 || !canProcess}
          className="flex-1"
        >
          {processing ? '处理中...' : !canProcess ? '请先添加 API Key' : `AI 抠图 ${files.length} 张图片`}
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
