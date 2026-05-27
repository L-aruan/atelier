import { useState, useCallback } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import type { CopyGenOptions } from './processor';

interface AiCopyGenToolProps extends ToolProps {
  apiKey?: string | null;
  onNavigateToKeys?: () => void;
  callApi?: (params: {
    productName: string;
    sellingPoints: string;
    platform?: string;
    style?: string;
    brandTone?: string;
    apiKey?: string;
  }) => Promise<{ title: string; description: string; tags: string[] }>;
}

const PLATFORMS = [
  { label: '通用', value: 'general' as const },
  { label: '淘宝', value: 'taobao' as const },
  { label: '抖音', value: 'douyin' as const },
  { label: '小红书', value: 'xiaohongshu' as const },
  { label: '拼多多', value: 'pdd' as const },
];

const STYLES = [
  { label: '专业', value: 'professional' as const },
  { label: '亲切', value: 'casual' as const },
  { label: '高端', value: 'luxury' as const },
  { label: '活力', value: 'youthful' as const },
];

const CATEGORY_TEMPLATES = [
  { label: '服装', productName: '连衣裙女款2024春夏', sellingPoints: '桑蚕丝面料、收腰显瘦、通勤百搭' },
  { label: '食品', productName: '手工曲奇饼干礼盒', sellingPoints: '0添加防腐剂、黄油原味、送礼首选' },
  { label: '数码', productName: '无线蓝牙耳机降噪版', sellingPoints: '40dB主动降噪、续航36小时、IPX5防水' },
  { label: '家居', productName: '北欧简约台灯', sellingPoints: '三档调光、护眼LED、实木底座' },
  { label: '美妆', productName: '持妆哑光口红', sellingPoints: '不沾杯、12色可选、滋润不拔干' },
];

export function AiCopyGenTool({
  onProcess,
  onDownload,
  processing,
  outputs,
  apiKey,
  onNavigateToKeys,
  callApi,
}: AiCopyGenToolProps) {
  const [productName, setProductName] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [platform, setPlatform] = useState<'taobao' | 'douyin' | 'xiaohongshu' | 'pdd' | 'general'>('general');
  const [style, setStyle] = useState<'professional' | 'casual' | 'luxury' | 'youthful'>('professional');
  const [brandTone, setBrandTone] = useState('');
  const [result, setResult] = useState<{ title: string; description: string; tags: string[] } | null>(null);

  const hasKey = !!apiKey;
  const hasOutput = outputs.length > 0;
  const canProcess = !!callApi && hasKey && productName.trim().length > 0 && sellingPoints.trim().length > 0;

  const handleGenerate = useCallback(async () => {
    if (!callApi || !productName.trim() || !sellingPoints.trim()) return;

    const options: CopyGenOptions = {
      productName: productName.trim(),
      sellingPoints: sellingPoints.trim(),
      platform,
      style,
      brandTone: brandTone.trim() || undefined,
      apiKey: apiKey || undefined,
      callApi,
    };

    const dummyInput = { file: new File([], 'prompt'), name: 'prompt', type: '', size: 0, url: '' };
    const results = await onProcess([dummyInput], options);
    if (results.length > 0) {
      // 读取结果文本用于预览
      const text = await results[0].blob.text();
      const match = text.match(/【标题】(.+?)\n[\s\S]*?【详情文案】\n([\s\S]*?)\n\n【关键词标签】(.+)/);
      if (match) {
        setResult({ title: match[1], description: match[2].trim(), tags: match[3].split('、') });
      }
    }
  }, [callApi, productName, sellingPoints, platform, style, apiKey, onProcess]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  }, []);

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
              {hasKey ? '使用 GPT-4o 生成文案，按量计费' : '前往设置添加 Key 后即可使用'}
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

      {/* 输入区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">商品名称</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="例如：轻薄羽绒服女款2024秋冬新款"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">核心卖点</label>
          <input
            type="text"
            value={sellingPoints}
            onChange={(e) => setSellingPoints(e.target.value)}
            placeholder="例如：90%白鹅绒、可机洗、轻至200g、多色可选"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* 品类快捷模板 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">快捷模板</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => {
                setProductName(tpl.productName);
                setSellingPoints(tpl.sellingPoints);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              {tpl.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">点击自动填充示例内容，降低使用门槛</p>
      </div>

      {/* 平台和风格选择 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">目标平台</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPlatform(p.value)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  platform === p.value
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">文案风格</label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  style === s.value
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 品牌语气（可选） */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          品牌语气 <span className="text-gray-400 font-normal">（可选）</span>
        </label>
        <input
          type="text"
          value={brandTone}
          onChange={(e) => setBrandTone(e.target.value)}
          placeholder="例如：年轻活泼、用网络流行语、亲切温暖、专业严谨"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">描述品牌调性，让生成的文案更符合品牌形象</p>
      </div>

      {/* 生成结果预览 */}
      {result && (
        <div className="bg-gray-50 rounded-lg p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">标题</span>
              <button onClick={() => handleCopy(result.title)} className="text-xs text-blue-500 hover:text-blue-700">复制</button>
            </div>
            <p className="text-sm text-gray-900 font-medium">{result.title}</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">详情文案</span>
              <button onClick={() => handleCopy(result.description)} className="text-xs text-blue-500 hover:text-blue-700">复制</button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.description}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">关键词标签</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {result.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => handleCopy(`【标题】${result.title}\n\n【详情文案】\n${result.description}\n\n【关键词标签】${result.tags.join('、')}`)}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            一键复制全部
          </button>
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
              ? '请先配置 API Key 并填写商品信息'
              : '生成文案'}
        </Button>
        {hasOutput && (
          <Button variant="secondary" onClick={() => onDownload(outputs)}>
            下载文案
          </Button>
        )}
      </div>
    </div>
  );
}
