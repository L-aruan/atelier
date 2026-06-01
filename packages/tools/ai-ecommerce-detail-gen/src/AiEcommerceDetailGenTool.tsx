import { useCallback, useRef, useState } from 'react';
import { Button } from '@atelier/ui-kit';
import type { FileOutput, ToolProps } from '@atelier/types';
import { renderEcommerceDetailOutput } from './processor';
import type {
  DetailPagePlan,
  EcommerceDetailRequest,
  EcommerceDetailResult,
  EcommerceLanguage,
  EcommercePlatform,
  EcommerceProvider,
  EcommerceReferenceImage,
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

const maxReferenceImages = 3;
const maxReferenceImageBytes = 20 * 1024 * 1024;

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('atelier:token');
}

type GeneratedPage = DetailPagePlan & {
  imageUrl: string;
};

function assetUrl(assetId: string) {
  const token = getAuthToken();
  return token
    ? `/api/ai-assets/${assetId}?token=${encodeURIComponent(token)}`
    : `/api/ai-assets/${assetId}`;
}

function jobZipUrl(jobId: string) {
  const token = getAuthToken();
  return token
    ? `/api/ai-generation-jobs/${jobId}/zip?token=${encodeURIComponent(token)}`
    : `/api/ai-generation-jobs/${jobId}/zip`;
}

function downloadJobZip(jobId: string) {
  window.location.href = jobZipUrl(jobId);
}

async function uploadReferenceImages(files: File[]): Promise<EcommerceReferenceImage[]> {
  const token = getAuthToken();
  const form = new FormData();
  files.forEach((file) => form.append('files', file));

  const response = await fetch('/api/ai-assets/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.error || `参考图上传失败: HTTP ${response.status}`);
  }
  return json.assets || [];
}

function revokeOutputLater(output: FileOutput) {
  if (!output.url.startsWith('blob:')) return;
  window.setTimeout(() => URL.revokeObjectURL(output.url), 30_000);
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
  const [generatedPages, setGeneratedPages] = useState<GeneratedPage[]>([]);
  const [summary, setSummary] = useState('');
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingPageId, setDownloadingPageId] = useState('');

  const providerApiKey = getApiKeyForProvider?.(provider) || apiKey || null;
  const hasKey = !!providerApiKey;
  const canGenerate =
    !!callGenerateDetailSet && productName.trim().length > 0 && files.length > 0;

  const handleFiles = useCallback((selectedFiles: FileList | null) => {
    const nextFiles = Array.from(selectedFiles || []).slice(0, maxReferenceImages);
    const oversized = nextFiles.find((file) => file.size > maxReferenceImageBytes);
    if (oversized) {
      setError(`${oversized.name} 超过 20MB 限制`);
      return;
    }

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
    setGeneratedPages([]);
    setSummary('');
    setJobId('');
    setDownloadingPageId('');

    try {
      const referenceImages = await uploadReferenceImages(files);
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
        referenceImages,
      });

      setSummary(result.productSummary);
      setJobId(result.jobId || '');
      const pages = result.pages
        .map((page) => ({
          ...page,
          imageUrl: page.imageAssetId ? assetUrl(page.imageAssetId) : page.imageUrl,
        }))
        .filter((page): page is GeneratedPage => !!page.imageUrl);

      setGeneratedPages(pages);
      setStatus(
        `已生成 ${pages.length} 张详情图，预览使用服务端素材，单张下载时再渲染成品图`,
      );
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
    pageCount,
    platform,
    productName,
    provider,
    providerApiKey,
    sellingPoints,
    style,
  ]);

  const handleDownloadPage = useCallback(async (page: GeneratedPage, index: number) => {
    setDownloadingPageId(page.id);
    setError('');

    try {
      const output = await renderEcommerceDetailOutput({
        productName: productName.trim(),
        page,
        index,
        width: 1024,
        height: 1536,
      });
      onDownload([output]);
      revokeOutputLater(output);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloadingPageId('');
    }
  }, [onDownload, productName]);

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

        {generatedPages.length === 0 ? (
          <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-gray-400">
            生成结果会显示在这里
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-800">
                已生成 {generatedPages.length} 张
              </p>
              {jobId && (
                <Button onClick={() => downloadJobZip(jobId)}>下载原图 ZIP</Button>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {generatedPages.map((page, index) => (
                <div
                  key={page.id || page.imageUrl}
                  className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                >
                  <img
                    src={page.imageUrl}
                    alt={page.title}
                    className="w-full object-cover"
                    loading="lazy"
                  />
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="truncate text-xs text-gray-500">
                      {String(index + 1).padStart(2, '0')}_{page.type}.png
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownloadPage(page, index)}
                      disabled={downloadingPageId === page.id}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                    >
                      {downloadingPageId === page.id ? '渲染中...' : '下载成品'}
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
