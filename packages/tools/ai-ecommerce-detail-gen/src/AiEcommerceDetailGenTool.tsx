import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@atelier/ui-kit';
import type { FileOutput, ToolProps } from '@atelier/types';
import JSZip from 'jszip';
import { renderEcommerceDetailOutputs } from './processor';
import type {
  EcommerceDetailRequest,
  EcommerceDetailResult,
  EcommerceLanguage,
  EcommercePlatform,
  EcommerceProvider,
} from './types';

interface AiEcommerceDetailGenToolProps extends ToolProps {
  apiKey?: string | null;
  getApiKeyForProvider?: (provider: string) => string | null;
  onNavigateToKeys?: () => void;
  callGenerateDetailSet?: (params: EcommerceDetailRequest) => Promise<EcommerceDetailResult>;
}

const PLATFORM_OPTIONS: Array<{ label: string; value: EcommercePlatform }> = [
  { label: '淘宝', value: 'taobao' },
  { label: '抖音', value: 'douyin' },
  { label: '小红书', value: 'xiaohongshu' },
  { label: '拼多多', value: 'pdd' },
  { label: '通用', value: 'general' },
];

const PROVIDER_OPTIONS: Array<{ label: string; value: EcommerceProvider }> = [
  { label: 'Packy GPT-Image-2', value: 'packy' },
  { label: 'OpenAI', value: 'openai' },
  { label: '火山方舟', value: 'volcengine' },
  { label: '阿里云', value: 'aliyun' },
];

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function revokeOutputs(outputs: FileOutput[]) {
  outputs.forEach((output) => {
    if (output.url.startsWith('blob:')) URL.revokeObjectURL(output.url);
  });
}

export function AiEcommerceDetailGenTool({
  onDownload,
  processing,
  apiKey,
  getApiKeyForProvider,
  onNavigateToKeys,
  callGenerateDetailSet,
}: AiEcommerceDetailGenToolProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [productName, setProductName] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [platform, setPlatform] = useState<EcommercePlatform>('taobao');
  const [language, setLanguage] = useState<EcommerceLanguage>('zh-CN');
  const [provider, setProvider] = useState<EcommerceProvider>('packy');
  const [style, setStyle] = useState<'professional' | 'warm' | 'premium' | 'minimal'>('warm');
  const [imageQuality, setImageQuality] = useState<'low' | 'medium' | 'high' | 'auto'>('medium');
  const [pageCount, setPageCount] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [localOutputs, setLocalOutputs] = useState<FileOutput[]>([]);
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const providerApiKey = getApiKeyForProvider?.(provider) || apiKey || null;
  const hasKey = !!providerApiKey;
  const canGenerate =
    !!callGenerateDetailSet && productName.trim().length > 0 && files.length > 0;

  const generatedZip = useMemo(
    () => localOutputs.find((output) => output.type === 'application/zip'),
    [localOutputs],
  );

  const handleFiles = useCallback((selectedFiles: FileList | null) => {
    const nextFiles = Array.from(selectedFiles || []).slice(0, 3);
    previews.forEach((preview) => URL.revokeObjectURL(preview));
    setFiles(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
    setError('');
  }, [previews]);

  const clearFiles = useCallback(() => {
    previews.forEach((preview) => URL.revokeObjectURL(preview));
    setFiles([]);
    setPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [previews]);

  const handleGenerate = useCallback(async () => {
    if (!callGenerateDetailSet || !canGenerate) return;

    setIsGenerating(true);
    setError('');
    setStatus('正在读取参考图...');
    revokeOutputs(localOutputs);
    setLocalOutputs([]);
    setSummary('');

    try {
      const images = await Promise.all(files.map(fileToDataUrl));
      setStatus('正在分析产品并生成详情图脚本...');
      const result = await callGenerateDetailSet({
        productName: productName.trim(),
        sellingPoints: sellingPoints.trim() || undefined,
        platform,
        language,
        style,
        imageQuality,
        pageCount,
        provider,
        apiKey: providerApiKey || undefined,
        images,
      });

      setSummary(result.productSummary);
      setStatus('正在渲染中文标题、卖点和标注...');
      const rendered = await renderEcommerceDetailOutputs({
        productName: productName.trim(),
        pages: result.pages,
        width: 1024,
        height: 1536,
      });

      const zipOutput = await (async () => {
        const zip = new JSZip();
        rendered.forEach((output) => zip.file(output.name, output.blob));
        const blob = await zip.generateAsync({ type: 'blob' });
        return {
          blob,
          name: `${productName.trim()}_电商详情页.zip`,
          type: 'application/zip',
          size: blob.size,
          url: URL.createObjectURL(blob),
        };
      })();

      setLocalOutputs([...rendered, zipOutput]);
      setStatus(`已生成 ${rendered.length} 张详情图`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('');
    } finally {
      setIsGenerating(false);
    }
  }, [
    callGenerateDetailSet,
    canGenerate,
    files,
    imageQuality,
    language,
    localOutputs,
    pageCount,
    platform,
    productName,
    provider,
    providerApiKey,
    sellingPoints,
    style,
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-5">
        <div
          className={`rounded-lg border p-4 text-sm ${
            hasKey ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={hasKey ? 'font-medium text-green-800' : 'font-medium text-amber-800'}>
                {hasKey
                  ? `已配置 ${provider === 'packy' ? 'PackyAPI' : '生图'} API Key`
                  : '未在浏览器设置中检测到 API Key'}
              </p>
              <p className={hasKey ? 'mt-1 text-xs text-green-700' : 'mt-1 text-xs text-amber-700'}>
                Packy 模式使用 gpt-image-2 图生图；也可使用服务端环境变量 PACKY_API_KEY。
              </p>
            </div>
            {onNavigateToKeys && (
              <button
                type="button"
                onClick={onNavigateToKeys}
                className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                管理 Key
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">产品名称</label>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="例如：干锅酒精炉套装"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">产品卖点</label>
          <textarea
            value={sellingPoints}
            onChange={(e) => setSellingPoints(e.target.value)}
            rows={4}
            placeholder="可选，用逗号分隔：加深锅身、双耳把手、可调火力、金属拉丝..."
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">参考图片</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 hover:border-blue-300 hover:bg-blue-50"
          >
            上传 1-3 张真实产品图
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {previews.map((preview, index) => (
                <img
                  key={preview}
                  src={preview}
                  alt={`参考图 ${index + 1}`}
                  className="aspect-square rounded-lg border border-gray-200 object-cover"
                />
              ))}
            </div>
          )}
          {files.length > 0 && (
            <button
              type="button"
              onClick={clearFiles}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700"
            >
              清除参考图
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">平台</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as EcommercePlatform)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {PLATFORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">模型</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as EcommerceProvider)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">语言</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as EcommerceLanguage)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="zh-CN">中文</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">风格</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as typeof style)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="warm">烟火感</option>
              <option value="professional">专业</option>
              <option value="premium">高端</option>
              <option value="minimal">极简</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">张数</label>
            <select
              value={pageCount}
              onChange={(e) => setPageCount(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {[1, 2, 4, 6, 8, 10, 12].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">质量</label>
            <select
              value={imageQuality}
              onChange={(e) => setImageQuality(e.target.value as typeof imageQuality)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="auto">自动</option>
            </select>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={!canGenerate || processing || isGenerating}>
          {isGenerating ? '生成中...' : '生成详情页组图'}
        </Button>

        {status && <p className="text-sm text-blue-600">{status}</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>

      <div className="min-h-[520px] rounded-lg border border-gray-200 bg-gray-50 p-4">
        {summary && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-800">产品识别</p>
            <p className="mt-1 text-sm text-gray-600">{summary}</p>
          </div>
        )}

        {localOutputs.length === 0 ? (
          <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-gray-400">
            生成结果会显示在这里
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-800">
                已生成 {localOutputs.filter((output) => output.type === 'image/png').length} 张
              </p>
              {generatedZip && (
                <Button onClick={() => onDownload([generatedZip])}>下载全部 ZIP</Button>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {localOutputs
                .filter((output) => output.type === 'image/png')
                .map((output) => (
                  <div
                    key={output.url}
                    className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                  >
                    <img src={output.url} alt={output.name} className="w-full object-cover" />
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="truncate text-xs text-gray-500">{output.name}</span>
                      <button
                        type="button"
                        onClick={() => onDownload([output])}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        下载
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
