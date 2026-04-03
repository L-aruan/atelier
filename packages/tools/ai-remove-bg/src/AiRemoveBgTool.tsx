import { useState, useCallback } from 'react';
import { Button } from '@mediabox/ui-kit';
import type { ToolProps } from '@mediabox/types';
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

  const handleRemoveBg = useCallback(async () => {
    if (!callApi) return;
    const key = useOwnKey ? apiKey || undefined : undefined;
    const options: RemoveBgToolOptions = { apiKey: key, callApi };
    await onProcess(files, options);
  }, [files, onProcess, useOwnKey, apiKey, callApi]);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-800">
              {hasKey ? '✓ 已配置 remove.bg API Key' : '需要 remove.bg API Key 才能使用'}
            </p>
            <p className="text-blue-600 text-xs mt-1">
              {hasKey
                ? '使用你的 Key 可获得更好的配额'
                : '免费 Key 每月可处理 50 张图'}
            </p>
          </div>
          {onNavigateToKeys && (
            <button
              onClick={onNavigateToKeys}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {hasKey ? '管理 Key' : '去添加 →'}
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
          disabled={processing || files.length === 0 || !callApi}
          className="flex-1"
        >
          {processing ? '处理中...' : `AI 抠图 ${files.length} 张图片`}
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
