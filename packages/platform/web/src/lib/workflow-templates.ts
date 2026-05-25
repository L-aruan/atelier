import type { Workflow, WorkflowStep } from './workflow-types';

function newStep(partial: Omit<WorkflowStep, 'id'>): WorkflowStep {
  return { ...partial, id: crypto.randomUUID() };
}

const now = () => Date.now();

export const WORKFLOW_TEMPLATES: Workflow[] = [
  {
    id: 'tpl-ecommerce',
    name: '电商商品图批处理',
    description: '去背景后生成淘宝、京东、拼多多、抖音等上架尺寸 ZIP',
    isTemplate: true,
    createdAt: now(),
    updatedAt: now(),
    steps: [
      newStep({
        toolId: 'ai-remove-bg',
        label: '商品图去背景',
        options: {},
      }),
      newStep({
        toolId: 'image-platform-export',
        label: '导出电商平台尺寸',
        options: {
          presetIds: ['taobao-main', 'jd-main', 'pdd-main', 'taobao-detail', 'douyin-goods'],
          mode: 'fill',
          outputFormat: 'image/jpeg',
          quality: 0.9,
          backgroundColor: '#ffffff',
        },
      }),
    ],
  },
  {
    id: 'tpl-marketplace-sizes',
    name: '多平台尺寸批量导出',
    description: '一张图批量生成电商主图、详情图和社媒封面',
    isTemplate: true,
    createdAt: now(),
    updatedAt: now(),
    steps: [
      newStep({
        toolId: 'image-platform-export',
        label: '生成全部平台尺寸 ZIP',
        options: {
          presetIds: [
            'taobao-main',
            'jd-main',
            'pdd-main',
            'taobao-detail',
            'douyin-goods',
            'xiaohongshu',
            'bilibili-cover',
            'wechat-cover',
          ],
          mode: 'fill',
          outputFormat: 'image/jpeg',
          quality: 0.9,
          backgroundColor: '#ffffff',
        },
      }),
    ],
  },
  {
    id: 'tpl-cover',
    name: '自媒体封面制作',
    description: '16:9 裁剪后转为 WebP',
    isTemplate: true,
    createdAt: now(),
    updatedAt: now(),
    steps: [
      newStep({
        toolId: 'image-crop',
        label: '裁剪 16:9',
        options: { aspectPreset: '16:9' },
      }),
      newStep({
        toolId: 'image-format',
        label: '转为 WebP',
        options: { targetFormat: 'image/webp', quality: 0.92 },
      }),
    ],
  },
  {
    id: 'tpl-batch-compress',
    name: '图片批量压缩',
    description: '压缩后统一 WebP 格式',
    isTemplate: true,
    createdAt: now(),
    updatedAt: now(),
    steps: [
      newStep({
        toolId: 'image-compress',
        label: '压缩',
        options: { quality: 0.8, maxSizeMB: 1, maxWidthOrHeight: 1920 },
      }),
      newStep({
        toolId: 'image-format',
        label: '转为 WebP',
        options: { targetFormat: 'image/webp', quality: 0.9 },
      }),
    ],
  },
  {
    id: 'tpl-ai-product-set',
    name: 'AI 商品图一站式',
    description: 'AI 抠图 → 场景合成 → 多平台尺寸导出',
    isTemplate: true,
    createdAt: now(),
    updatedAt: now(),
    steps: [
      newStep({
        toolId: 'ai-remove-bg',
        label: 'AI 抠图去背景',
        options: {},
      }),
      newStep({
        toolId: 'ai-scene-compose',
        label: 'AI 场景合成',
        options: {
          scenePrompt: 'Professional studio background with soft gradient, warm lighting, product photography style',
        },
      }),
      newStep({
        toolId: 'image-platform-export',
        label: '导出电商平台尺寸',
        options: {
          presetIds: ['taobao-main', 'jd-main', 'pdd-main', 'douyin-goods'],
          mode: 'fill',
          outputFormat: 'image/jpeg',
          quality: 0.9,
          backgroundColor: '#ffffff',
        },
      }),
    ],
  },
  {
    id: 'tpl-ai-copy-batch',
    name: 'AI 批量文案生成',
    description: '多商品一键生成淘宝/抖音/小红书风格文案',
    isTemplate: true,
    createdAt: now(),
    updatedAt: now(),
    steps: [
      newStep({
        toolId: 'ai-copy-gen',
        label: 'AI 文案生成',
        options: {
          platform: 'general',
          style: 'professional',
        },
      }),
    ],
  },
];

export function createFromTemplate(templateId: string): Workflow | null {
  const tpl = WORKFLOW_TEMPLATES.find((w) => w.id === templateId);
  if (!tpl) return null;
  const t = now();
  return {
    ...tpl,
    id: crypto.randomUUID(),
    isTemplate: false,
    createdAt: t,
    updatedAt: t,
    steps: tpl.steps.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
    })),
  };
}
