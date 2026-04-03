import type { Workflow, WorkflowStep } from './workflow-types';

function newStep(partial: Omit<WorkflowStep, 'id'>): WorkflowStep {
  return { ...partial, id: crypto.randomUUID() };
}

const now = () => Date.now();

export const WORKFLOW_TEMPLATES: Workflow[] = [
  {
    id: 'tpl-ecommerce',
    name: '电商商品图批处理',
    description: '裁剪为 1:1，再压缩到小体积便于上架',
    isTemplate: true,
    createdAt: now(),
    updatedAt: now(),
    steps: [
      newStep({
        toolId: 'image-crop',
        label: '裁剪 1:1',
        options: { aspectPreset: '1:1' },
      }),
      newStep({
        toolId: 'image-compress',
        label: '压缩',
        options: { quality: 0.85, maxSizeMB: 0.5, maxWidthOrHeight: 1920 },
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
