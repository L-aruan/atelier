import { useState, useCallback } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import type { SceneComposeOptions } from './processor';

interface AiSceneComposeToolProps extends ToolProps {
  apiKey?: string | null;
  onNavigateToKeys?: () => void;
  callApi?: (imageBase64: string, apiKey?: string) => Promise<{ resultBase64: string; type: string }>;
  callGenerateImage?: (params: {
    prompt: string;
    size?: string;
    quality?: string;
    n?: number;
    apiKey?: string;
  }) => Promise<{ images: string[] }>;
}

const SCENE_TEMPLATES = [
  {
    id: 'white',
    label: '纯白背景',
    prompt: 'Clean pure white background, studio lighting, product photography, minimal',
  },
  {
    id: 'studio',
    label: '影棚质感',
    prompt: 'Professional studio background with soft gradient, warm lighting, product photography style',
  },
  {
    id: 'lifestyle',
    label: '生活场景',
    prompt: 'Cozy lifestyle setting, wooden table, natural daylight, home interior background',
  },
  {
    id: 'outdoor',
    label: '户外自然',
    prompt: 'Beautiful outdoor nature scene, green garden, soft sunlight, blurred background',
  },
  {
    id: 'festival',
    label: '节日促销',
    prompt: 'Festive promotional background, red and gold colors, celebration theme, confetti',
  },
  {
    id: 'luxury',
    label: '高端奢华',
    prompt: 'Luxury marble texture background, golden accents, elegant product display, premium feel',
  },
];

export function AiSceneComposeTool({
  files,
  onProcess,
  onDownload,
  processing,
  outputs,
  apiKey,
  onNavigateToKeys,
  callApi,
  callGenerateImage,
}: AiSceneComposeToolProps) {
  const [selectedScene, setSelectedScene] = useState(SCENE_TEMPLATES[0].id);
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const hasKey = !!apiKey;
  const hasOutput = outputs.length > 0;
  const canProcess = !!callApi && !!callGenerateImage && hasKey && files.length > 0;

  const currentPrompt = useCustom
    ? customPrompt
    : SCENE_TEMPLATES.find((s) => s.id === selectedScene)?.prompt || '';

  const handleCompose = useCallback(async () => {
    if (!callApi || !callGenerateImage || !currentPrompt) return;

    const options: SceneComposeOptions = {
      scenePrompt: currentPrompt,
      apiKey: apiKey || undefined,
      callRemoveBg: callApi,
      callGenerateImage,
    };

    await onProcess(files, options);
  }, [callApi, callGenerateImage, currentPrompt, apiKey, files, onProcess]);

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
              {hasKey ? '抠图 + 场景生成，按量计费' : '前往设置添加 Key 后即可使用'}
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

      {/* 场景模板选择 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">选择场景模板</label>
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="rounded"
            />
            自定义描述
          </label>
        </div>

        {!useCustom ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SCENE_TEMPLATES.map((scene) => (
              <button
                key={scene.id}
                onClick={() => setSelectedScene(scene.id)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedScene === scene.id
                    ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-sm font-medium text-gray-800">{scene.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="描述想要的背景场景，例如：简约现代风格客厅，浅灰色沙发，柔和的自然光"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
        )}
      </div>

      {/* 已上传文件预览 */}
      {files.length > 0 && (
        <div>
          <span className="text-sm font-medium text-gray-700">待处理图片</span>
          <div className="mt-2 flex gap-3 flex-wrap">
            {files.map((f) => (
              <div key={f.name} className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 结果预览 */}
      {hasOutput && (
        <div>
          <span className="text-sm font-medium text-gray-700">合成结果</span>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
            {outputs.map((output) => (
              <div key={output.name} className="rounded-lg overflow-hidden border border-gray-200">
                <img src={output.url} alt={output.name} className="w-full aspect-square object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <Button
          onClick={handleCompose}
          disabled={processing || !canProcess || (!useCustom && !selectedScene) || (useCustom && !customPrompt.trim())}
          className="flex-1"
        >
          {processing
            ? '合成中...'
            : !canProcess
              ? '请先配置 API Key 并上传图片'
              : 'AI 场景合成'}
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
