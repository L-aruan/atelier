'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@atelier/ui-kit';
import { createFromTemplate } from '@/lib/workflow-templates';
import { saveWorkflow } from '@/lib/workflow-store';

const QUICK_STARTS = [
  {
    id: 'ecommerce',
    title: '电商商品图批处理',
    description: '去背景后批量生成淘宝、京东、拼多多、抖音上架尺寸。',
    action: '使用模板',
    templateId: 'tpl-ecommerce',
  },
  {
    id: 'ai-product-set',
    title: 'AI 商品图一站式',
    description: 'AI 抠图 → 场景合成 → 多平台导出，一条流水线搞定。',
    action: '使用模板',
    templateId: 'tpl-ai-product-set',
  },
  {
    id: 'ai-image-gen',
    title: 'AI 商品图生成',
    description: '输入商品描述，AI 直接生成高质量商品图片。',
    action: '打开工具',
    href: '/tool/ai-image-gen',
  },
  {
    id: 'ai-copy-gen',
    title: 'AI 电商文案',
    description: '一键生成淘宝、抖音、小红书等多平台风格文案。',
    action: '打开工具',
    href: '/tool/ai-copy-gen',
  },
  {
    id: 'platform-export',
    title: '多平台尺寸批量导出',
    description: '一张图导出电商主图、详情图和社媒封面 ZIP。',
    action: '打开工具',
    href: '/tool/image-platform-export',
  },
  {
    id: 'doc-format',
    title: 'Word 报告格式统一',
    description: '用模板文档统一页面、样式、页眉页脚和编号。',
    action: '打开工具',
    href: '/tool/doc-format-brush',
  },
];

export function P0QuickStarts() {
  const router = useRouter();

  const handleClick = async (item: (typeof QUICK_STARTS)[number]) => {
    if ('templateId' in item && item.templateId) {
      const workflow = createFromTemplate(item.templateId);
      if (!workflow) return;
      await saveWorkflow(workflow);
      router.push(`/workflow/${workflow.id}`);
      return;
    }
    if ('href' in item && item.href) {
      router.push(item.href);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">核心场景</h2>
        <p className="text-sm text-gray-500 mt-1">优先打磨可直接交付结果的批量任务。</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUICK_STARTS.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg bg-white p-4">
            <h3 className="font-medium text-gray-900">{item.title}</h3>
            <p className="text-sm text-gray-500 mt-2 min-h-[40px]">{item.description}</p>
            <Button type="button" size="sm" className="mt-4" onClick={() => handleClick(item)}>
              {item.action}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
