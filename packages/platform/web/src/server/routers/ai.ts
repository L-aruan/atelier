import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '../db';
import { readAiAssetBuffer, writeAiAssetBuffer } from '../ai-assets/storage';

type DetailPageType =
  | 'hero'
  | 'value'
  | 'scene'
  | 'structure'
  | 'material'
  | 'specs'
  | 'accessories'
  | 'usage';

interface DetailPageDraft {
  id: string;
  type: DetailPageType;
  title: string;
  subtitle: string;
  scenePrompt: string;
  productInstruction: string;
  negativePrompt?: string;
  bullets: string[];
  hotspots: Array<{
    label: string;
    description: string;
    x: number;
    y: number;
  }>;
}

interface DetailPlan {
  productSummary: string;
  pages: DetailPageDraft[];
}

interface ReferenceImageAsset {
  storageKey: string;
  mimeType: string;
  fileName?: string;
  size?: number;
}

type ReferenceImageInput = string | ReferenceImageAsset;

const detailPageTypes = [
  'hero',
  'value',
  'scene',
  'structure',
  'material',
  'specs',
  'accessories',
  'usage',
] as const;

function aiLog(event: string, details: Record<string, unknown>) {
  console.info(`[ai-ecommerce-detail-gen] ${event}`, details);
}

function modelForProvider(provider: string, operation: 'plan' | 'image') {
  if (provider === 'packy') {
    return operation === 'plan'
      ? process.env.MIMO_TEXT_MODEL || 'mimo-v2.5'
      : process.env.PACKY_IMAGE_MODEL || 'gpt-image-2';
  }
  return operation === 'plan'
    ? process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini'
    : process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
}

function safeStringify(value: unknown) {
  return JSON.stringify(value, (_key, item) => {
    if (typeof item === 'string' && item.length > 1000) return `${item.slice(0, 1000)}...`;
    return item;
  });
}

function sanitizeDetailRequest(input: {
  productName: string;
  sellingPoints?: string;
  platform: string;
  language: string;
  style: string;
  imageQuality: string;
  pageCount: number;
  provider: string;
  images?: string[];
  referenceImages?: ReferenceImageAsset[];
}) {
  const referenceImages = getReferenceImages(input);
  return {
    productName: input.productName,
    sellingPoints: input.sellingPoints || '',
    platform: input.platform,
    language: input.language,
    style: input.style,
    imageQuality: input.imageQuality,
    pageCount: input.pageCount,
    provider: input.provider,
    imageCount: referenceImages.length,
    imageBytesApprox: referenceImages.map((image) =>
      typeof image === 'string' ? Math.round(image.length * 0.75) : image.size || 0,
    ),
  };
}

function errorSummary(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { message: String(error) };
}

function safeJsonParse<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced?.[1] || trimmed;
  return JSON.parse(jsonText) as T;
}

function normalizePlan(plan: DetailPlan, pageCount: number): DetailPlan {
  const pages = (plan.pages || []).slice(0, pageCount).map((page, index) => ({
    id: page.id || `page-${index + 1}`,
    type: detailPageTypes.includes(page.type) ? page.type : detailPageTypes[index % detailPageTypes.length],
    title: String(page.title || '产品亮点').slice(0, 40),
    subtitle: String(page.subtitle || '').slice(0, 60),
    scenePrompt: String(page.scenePrompt || 'premium ecommerce product photography').slice(0, 1200),
    productInstruction: String(page.productInstruction || '').slice(0, 800),
    negativePrompt: String(page.negativePrompt || '').slice(0, 500),
    bullets: (page.bullets || []).slice(0, 4).map((item) => String(item).slice(0, 28)),
    hotspots: (page.hotspots || []).slice(0, 4).map((hotspot) => ({
      label: String(hotspot.label || '细节').slice(0, 10),
      description: String(hotspot.description || '').slice(0, 18),
      x: Math.max(0.08, Math.min(0.92, Number(hotspot.x) || 0.5)),
      y: Math.max(0.18, Math.min(0.82, Number(hotspot.y) || 0.5)),
    })),
  }));

  return {
    productSummary: String(plan.productSummary || '已识别上传的产品参考图').slice(0, 200),
    pages,
  };
}

function parseImageInput(image: string) {
  const match = image.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) {
    return { mimeType: 'image/png', base64: image };
  }
  return { mimeType: match[1], base64: match[2] };
}

function imageInputToDataUrl(image: string) {
  if (image.startsWith('data:')) return image;
  return `data:image/png;base64,${image}`;
}

function imageInputToBlob(image: string) {
  const parsed = parseImageInput(image);
  const buffer = Buffer.from(parsed.base64, 'base64');
  return new Blob([buffer], { type: parsed.mimeType });
}

async function referenceImageToBlob(image: ReferenceImageInput) {
  if (typeof image === 'string') return imageInputToBlob(image);
  const buffer = await readAiAssetBuffer(image.storageKey);
  return new Blob([buffer], { type: image.mimeType });
}

async function referenceImageToDataUrl(image: ReferenceImageInput) {
  if (typeof image === 'string') return imageInputToDataUrl(image);
  const buffer = await readAiAssetBuffer(image.storageKey);
  return `data:${image.mimeType};base64,${buffer.toString('base64')}`;
}

function getReferenceImages(input: {
  images?: string[];
  referenceImages?: ReferenceImageAsset[];
}): ReferenceImageInput[] {
  if (input.referenceImages?.length) return input.referenceImages;
  return input.images || [];
}

function assertReferenceImageOwnership(userId: string, images: ReferenceImageInput[]) {
  const userUploadPrefix = `uploads/${userId}/`;
  const invalidImage = images.find(
    (image) => typeof image !== 'string' && !image.storageKey.startsWith(userUploadPrefix),
  );

  if (invalidImage) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '参考图无权访问',
    });
  }
}

function pageTypeRichnessInstruction(type: DetailPageType) {
  const common =
    'Use the reference product as the only hero product. Keep its exact shape, color, material finish, handles, visible parts, proportions, and category. Add richness only through scene, props, lighting, camera angle, depth, and composition.';

  const byType: Record<DetailPageType, string> = {
    hero:
      'Hero opening image: create a premium first-screen ecommerce visual with a rich but believable setting, layered foreground/background depth, tasteful props, warm commercial lighting, and generous clean space for title overlay. Avoid a plain isolated product shot.',
    value:
      'Value proposition image: show the product clearly with 2-3 relevant lifestyle or studio props that reinforce the selling points. Composition should feel informative and conversion-oriented, with clean zones for bullet overlays.',
    scene:
      'Immersive usage scene: place the product in a realistic usage environment with contextual props, possible human hands if natural, ambient background detail, and strong lifestyle atmosphere. Make it feel used in real life, not a plain catalog photo.',
    structure:
      'Structure breakdown image: use a clean bright studio setup with the product centered and enough empty space around it for callout labels. Emphasize key visible parts and edges without adding fake parts.',
    material:
      'Material and texture image: emphasize surface finish, highlights, reflections, edge detail, and craftsmanship. Use subtle close-up feeling while keeping the full product recognizable and faithful.',
    specs:
      'Specification image: create a neat technical ecommerce view with orthographic or front angle, clean background, enough margins for dimension/spec callouts, and minimal decorative props.',
    accessories:
      'Accessories display image: arrange the main product with relevant included or visually compatible accessories around it, but do not invent impossible parts. Keep a clean product-kit layout suitable for ecommerce detail pages.',
    usage:
      'Usage demonstration image: show the product being prepared or used in a realistic scenario, with contextual items and optional hands. Prioritize believability, product stability, and clear action.',
  };

  return `${common}\n${byType[type]}`;
}

function sellingPointList(sellingPoints?: string) {
  const parsed = (sellingPoints || '')
    .split(/[，,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : ['主体清晰', '质感突出', '场景实用', '细节可见'];
}

function generateFallbackDetailPlan(params: {
  productName: string;
  sellingPoints?: string;
  style: string;
  pageCount: number;
}): DetailPlan {
  const points = sellingPointList(params.sellingPoints);
  const pageSeeds: Array<Omit<DetailPageDraft, 'id'>> = [
    {
      type: 'hero',
      title: `${params.productName}，一眼心动`,
      subtitle: '真实产品质感，适合电商详情页首屏',
      scenePrompt: 'warm lifestyle ecommerce hero image, wooden tabletop, realistic product photography, soft steam, premium warm lighting, clean negative space at top',
      productInstruction: 'Preserve the exact product from the reference photo, including its color, material, handles, visible structure, and proportions.',
      bullets: points.slice(0, 3),
      hotspots: [],
    },
    {
      type: 'value',
      title: '好看也好用',
      subtitle: points.slice(0, 2).join(' · ') || '核心卖点清晰呈现',
      scenePrompt: 'clean studio ecommerce product image, beige and white background, premium product centered, subtle reflections, no text in image',
      productInstruction: 'Keep the reference product faithful and realistic. Do not change the product category or key parts.',
      bullets: points.slice(0, 3),
      hotspots: [
        { label: points[0] || '主体清晰', description: '重点突出', x: 0.62, y: 0.42 },
        { label: points[1] || '质感突出', description: '细节可见', x: 0.35, y: 0.58 },
      ],
    },
    {
      type: 'scene',
      title: '场景感立刻到位',
      subtitle: '还原真实使用氛围，提升购买代入感',
      scenePrompt: 'realistic dining or home usage scene, warm ambient light, product in use on a table, tasteful props around it, commercial product photography',
      productInstruction: 'Use the uploaded product as the main subject. Keep shape, color, material and scale consistent with the reference.',
      bullets: ['生活化场景', '画面更有代入感', '适合详情页展示'],
      hotspots: [],
    },
    {
      type: 'structure',
      title: '结构细节看得见',
      subtitle: '关键部件清晰展示，降低用户理解成本',
      scenePrompt: 'technical ecommerce product detail photo, front angle product, clean bright background, sharp edges, visible structure, space around product for callouts',
      productInstruction: 'Keep all product components from the reference visible and accurately arranged.',
      bullets: points.slice(0, 3),
      hotspots: [
        { label: points[0] || '加深主体', description: '容量实用', x: 0.62, y: 0.36 },
        { label: points[1] || '稳固结构', description: '摆放稳定', x: 0.52, y: 0.64 },
        { label: points[2] || '细节工艺', description: '质感耐看', x: 0.78, y: 0.5 },
      ],
    },
    {
      type: 'material',
      title: '质感经得起细看',
      subtitle: '材质、光泽和边缘细节更适合转化',
      scenePrompt: 'premium macro-inspired ecommerce product photo, metallic or material texture emphasized, soft highlights, elegant neutral background, no text',
      productInstruction: 'Preserve the product material and finish from the reference. Emphasize real texture without changing design.',
      bullets: ['质感清晰', '光泽自然', '细节耐看'],
      hotspots: [
        { label: '材质质感', description: '细腻耐看', x: 0.58, y: 0.44 },
        { label: '边缘细节', description: '轮廓清楚', x: 0.74, y: 0.52 },
      ],
    },
    {
      type: 'usage',
      title: '使用简单直观',
      subtitle: '从展示到使用，一张图讲清楚',
      scenePrompt: 'realistic product usage demonstration scene, hands nearby if appropriate, home ecommerce photography, natural depth of field, premium clean composition',
      productInstruction: 'Keep the product faithful to the reference image and make the usage scenario believable.',
      bullets: ['操作直观', '场景明确', '适合日常使用'],
      hotspots: [
        { label: '使用位置', description: '一看就懂', x: 0.5, y: 0.58 },
      ],
    },
  ];

  return normalizePlan(
    {
      productSummary: `根据产品名称和参考图生成 ${params.productName} 的电商详情页脚本。`,
      pages: Array.from({ length: params.pageCount }, (_, index) => ({
        id: `page-${index + 1}`,
        ...pageSeeds[index % pageSeeds.length],
      })),
    },
    params.pageCount,
  );
}

void generateFallbackDetailPlan;

async function generateOpenAiDetailPlan(params: {
  apiKey: string;
  productName: string;
  sellingPoints?: string;
  platform: string;
  language: string;
  style: string;
  pageCount: number;
  images: string[];
}): Promise<DetailPlan> {
  const pageTypeHint = detailPageTypes.slice(0, Math.max(4, params.pageCount)).join(', ');
  const prompt = `你是资深电商详情页策划和商品摄影指导。请根据上传的真实产品图，输出严格 JSON，不要 Markdown。

目标：为「${params.productName}」生成 ${params.pageCount} 张电商详情页脚本。
平台：${params.platform}
语言：${params.language}
风格：${params.style}
用户卖点：${params.sellingPoints || '未填写，请根据图片和常见电商表达提炼'}

要求：
- 保持产品真实可信，不夸大不可见功能。
- 每页必须是不同页面类型，优先覆盖：${pageTypeHint}
- 中文标题短促有力，subtitle 补充场景或利益点。
- scenePrompt 用英文描述最终图片画面，但不要让模型生成文字。
- productInstruction 说明如何保持参考图中的产品外观、颜色、结构。
- hotspots 的 x/y 是 0-1 的相对坐标，用于后续画标注线。

JSON 结构：
{
  "productSummary": "一句话总结识别到的产品",
  "pages": [
    {
      "id": "page-1",
      "type": "hero",
      "title": "短标题",
      "subtitle": "副标题",
      "scenePrompt": "English image prompt",
      "productInstruction": "English product preservation instruction",
      "bullets": ["卖点1", "卖点2"],
      "hotspots": [{"label": "加深锅身", "description": "容量更实用", "x": 0.65, "y": 0.38}]
    }
  ]
}`;

  const content = [
    { type: 'text', text: prompt },
    ...params.images.slice(0, 3).map((image) => ({
      type: 'image_url',
      image_url: { url: imageInputToDataUrl(image) },
    })),
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `OpenAI 商品分析错误: ${response.status} ${errorBody.slice(0, 400)}`,
    });
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'OpenAI 商品分析返回为空',
    });
  }

  return normalizePlan(safeJsonParse<DetailPlan>(text), params.pageCount);
}

async function generateMimoDetailPlan(params: {
  productName: string;
  sellingPoints?: string;
  platform: string;
  language: string;
  style: string;
  pageCount: number;
  images: string[];
}): Promise<DetailPlan> {
  const apiKey = process.env.MIMO_TEXT_API_KEY || '';
  if (!apiKey) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Packy 模式需要先配置服务端 MIMO_TEXT_API_KEY，用于生成详情页脚本和图生图 prompt。',
    });
  }

  const baseUrl = (process.env.MIMO_BASE_URL || 'https://api.mimo-v2.com/v1').replace(/\/$/, '');
  const model = process.env.MIMO_TEXT_MODEL || 'mimo-v2.5';
  const startedAt = Date.now();
  aiLog('mimo.plan.start', {
    baseUrl,
    model,
    pageCount: params.pageCount,
    imageCount: params.images.length,
    platform: params.platform,
    style: params.style,
    apiKeyPrefix: apiKey.slice(0, 8) + '...',
    apiKeyLength: apiKey.length,
  });
  const pageTypePlan =
    params.pageCount <= 1
      ? '1 page: hero'
      : params.pageCount <= 4
        ? '4 pages: hero, scene, structure, material'
        : params.pageCount <= 6
          ? '6 pages: hero, value, scene, structure, material, usage'
          : '8+ pages: hero, value, scene, structure, material, usage, accessories, specs, then repeat with contrast/assurance angles';
  const prompt = `你是资深电商详情页策划、电商摄影指导和图生图 prompt 工程师。请根据产品名称和卖点，生成给 PackyAPI gpt-image-2 /v1/images/edits 使用的结构化详情页方案。注意：真实产品参考图会在下一步直接传给 Packy 图生图模型，你不需要也不能读取图片。

产品名称：${params.productName}
用户卖点：${params.sellingPoints || '未填写，请根据产品名称和常见电商表达提炼'}
平台：${params.platform}
语言：${params.language}
风格：${params.style}
需要页数：${params.pageCount}

输出要求：
- 只输出严格 JSON，不要 Markdown，不要解释。
- 页面类型规划：${pageTypePlan}
- type 只能从这些值中选择：${detailPageTypes.join(', ')}
- 每页必须承担不同详情页任务，避免连续生成相同场景、相同视角、相同道具。
- title/subtitle/bullets/hotspots 用中文，适合后续 Canvas 排版。
- scenePrompt 和 productInstruction 用英文，直接用于 Packy 图生图 prompt。
- scenePrompt 必须写得具体、丰富且商业可信：说明环境、前景/背景层次、桌面/生活道具、食物或手部是否需要、灯光、镜头角度、主体位置、留白区域；不要让模型生成任何文字。
- hero/scene/usage 页面可以加入真实使用氛围、食物/生活道具、人物手部、环境层次。
- structure/material/specs/accessories 页面要信息密度更高，强调结构、材质、配件、规格感，背景更干净，适合后续标注。
- productInstruction 必须严格强调保持参考图产品的颜色、材质、比例、结构、关键零件，不要改变产品类别，不要添加额外把手/旋钮/支架/错误配件。
- negativePrompt 写英文反向约束：no text, no logo, no watermark, no distorted product, no extra product parts, no wrong handles, no changed material, no unrealistic shape 等。
- hotspots 的 x/y 是 0-1 相对坐标，只给结构/材质/规格类页面。
- 不要编造认证、材质等级、容量参数；如果用户未提供卖点，用泛化但可信的电商表达。

JSON schema：
{
  "productSummary": "一句话总结识别到的产品和外观",
  "pages": [
    {
      "id": "page-1",
      "type": "hero",
      "title": "短标题",
      "subtitle": "副标题",
      "scenePrompt": "English prompt for image-to-image scene generation",
      "productInstruction": "English instruction to preserve the reference product faithfully",
      "negativePrompt": "English negative prompt",
      "bullets": ["卖点1", "卖点2"],
      "hotspots": [{"label": "部件", "description": "说明", "x": 0.6, "y": 0.4}]
    }
  ]
}`;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.35,
        top_p: 0.9,
        max_completion_tokens: 4096,
      }),
    });
  } catch (e) {
    aiLog('mimo.plan.fetch_failed', {
      baseUrl,
      model,
      durationMs: Date.now() - startedAt,
      error: errorSummary(e),
    });
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Mimo 网络请求失败: ${e instanceof Error ? e.message : String(e)}。请检查 MIMO_BASE_URL 是否正确、当前网络是否能访问该域名。`,
    });
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      aiLog('mimo.plan.error_response', {
        status: response.status,
        errorJson,
        headers: Object.fromEntries(response.headers.entries()),
      });
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch {
      const text = await response.text().catch(() => '');
      aiLog('mimo.plan.error_text', { status: response.status, text: text.slice(0, 500) });
      if (text) errorMessage = text.slice(0, 400);
    }
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Mimo 详情页脚本生成错误: ${errorMessage}`,
    });
  }

  const json = await response.json();
  aiLog('mimo.plan.response', {
    baseUrl,
    model,
    status: response.status,
    durationMs: Date.now() - startedAt,
  });
  const text = json.choices?.[0]?.message?.content;
  if (!text) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Mimo 未返回详情页脚本内容',
    });
  }

  let plan: DetailPlan;
  try {
    plan = safeJsonParse<DetailPlan>(text);
  } catch {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Mimo 返回格式异常，无法解析为详情页 JSON',
    });
  }

  const normalized = normalizePlan(plan, params.pageCount);
  if (normalized.pages.length === 0) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Mimo 未生成可用的详情页脚本',
    });
  }
  aiLog('mimo.plan.success', {
    pageCount: normalized.pages.length,
    durationMs: Date.now() - startedAt,
  });
  return normalized;
}

async function callOpenAiImageGeneration(params: {
  apiKey: string;
  prompt: string;
  referenceImage?: ReferenceImageInput;
}): Promise<string> {
  if (params.referenceImage) {
    const form = new FormData();
    form.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
    form.append('prompt', params.prompt);
    form.append('size', '1024x1536');
    form.append('quality', 'high');
    form.append('image', await referenceImageToBlob(params.referenceImage), 'reference.png');

    const editResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${params.apiKey}` },
      body: form,
    });

    if (editResponse.ok) {
      const editJson = await editResponse.json();
      const image = editJson.data?.[0]?.b64_json;
      if (image) return image;
    }
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      prompt: params.prompt,
      n: 1,
      size: '1024x1536',
      quality: 'high',
      background: 'opaque',
    }),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {
      // Keep the generic message.
    }
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `OpenAI 详情图生成错误: ${errorMessage}`,
    });
  }

  const json = await response.json();
  const image = json.data?.[0]?.b64_json;
  if (!image) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'OpenAI 生图返回格式异常',
    });
  }
  return image;
}

async function fetchImageUrlAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Packy 图片下载失败: HTTP ${response.status}`,
    });
  }
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

function timeoutSignal(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timeout) };
}

async function parseImageApiResponse(response: Response, providerLabel: string): Promise<string> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch {
      const text = await response.text().catch(() => '');
      if (text) errorMessage = text.slice(0, 400);
    }
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `${providerLabel} 生图错误: ${errorMessage}`,
    });
  }

  const json = await response.json();
  const item = json.data?.[0];
  if (item?.b64_json) return item.b64_json;
  if (item?.url) return fetchImageUrlAsBase64(item.url);

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `${providerLabel} 生图返回格式异常`,
  });
}

async function callPackyImageGeneration(params: {
  apiKey: string;
  prompt: string;
  quality: 'low' | 'medium' | 'high' | 'auto';
  referenceImage?: ReferenceImageInput;
}): Promise<string> {
  const startedAt = Date.now();
  aiLog('packy.image.start', {
    mode: params.referenceImage ? 'edit' : 'generation',
    model: process.env.PACKY_IMAGE_MODEL || 'gpt-image-2',
    quality: params.quality,
    hasReferenceImage: !!params.referenceImage,
  });
  if (params.referenceImage) {
    const form = new FormData();
    form.append('model', process.env.PACKY_IMAGE_MODEL || 'gpt-image-2');
    form.append('prompt', params.prompt);
    form.append('image', await referenceImageToBlob(params.referenceImage), 'reference.png');
    form.append('size', '1024x1536');
    form.append('quality', params.quality);
    form.append('output_format', 'png');
    form.append('response_format', 'url');
    form.append('input_fidelity', 'high');
    form.append('n', '1');

    const requestTimeout = timeoutSignal(240000);
    try {
      const editResponse = await fetch('https://www.packyapi.com/v1/images/edits', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          Accept: '*/*',
        },
        body: form,
        signal: requestTimeout.signal,
      });

      const image = await parseImageApiResponse(editResponse, 'PackyAPI');
      aiLog('packy.image.success', {
        mode: 'edit',
        durationMs: Date.now() - startedAt,
      });
      return image;
    } catch (e) {
      aiLog('packy.image.failed', {
        mode: 'edit',
        durationMs: Date.now() - startedAt,
        error: errorSummary(e),
      });
      if (e instanceof Error && e.name === 'AbortError') {
        throw new TRPCError({
          code: 'TIMEOUT',
          message: 'PackyAPI 图生图超过 240 秒未返回。建议先用 1 张、低/中质量测试，或检查 packyapi.com 是否走了会断长连接的代理。',
        });
      }
      throw e;
    } finally {
      requestTimeout.cancel();
    }
  }

  const requestTimeout = timeoutSignal(240000);
  try {
    const response = await fetch('https://www.packyapi.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        model: process.env.PACKY_IMAGE_MODEL || 'gpt-image-2',
        prompt: params.prompt,
        size: '1024x1536',
        quality: params.quality,
        output_format: 'png',
        response_format: 'url',
        background: 'opaque',
        n: 1,
      }),
      signal: requestTimeout.signal,
    });

    const image = await parseImageApiResponse(response, 'PackyAPI');
    aiLog('packy.image.success', {
      mode: 'generation',
      durationMs: Date.now() - startedAt,
    });
    return image;
  } catch (e) {
    aiLog('packy.image.failed', {
      mode: 'generation',
      durationMs: Date.now() - startedAt,
      error: errorSummary(e),
    });
    if (e instanceof Error && e.name === 'AbortError') {
      throw new TRPCError({
        code: 'TIMEOUT',
        message: 'PackyAPI 文生图超过 240 秒未返回。建议降低质量或检查 packyapi.com 长连接是否被代理中断。',
      });
    }
    throw e;
  } finally {
    requestTimeout.cancel();
  }
}

export const aiRouter = router({
  removeBg: protectedProcedure
    .input(
      z
        .object({
        imageBase64: z.string(),
        apiKey: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const key = input.apiKey || process.env.REMOVE_BG_API_KEY || '';
      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: input.imageBase64,
          size: 'auto',
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `remove.bg API 错误: ${response.status} ${errorBody}`,
        });
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return { resultBase64: base64, type: 'image/png' };
    }),

  generateImage: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1, '请输入商品描述').max(32000),
        apiKey: z.string().optional(),
        size: z.enum(['1024x1024', '1536x1024', '1024x1536', 'auto']).default('1024x1024'),
        quality: z.enum(['low', 'medium', 'high', 'auto']).default('auto'),
        n: z.number().int().min(1).max(4).default(1),
        background: z.enum(['transparent', 'opaque', 'auto']).default('auto').optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const apiKey = input.apiKey || process.env.OPENAI_API_KEY || '';
      if (!apiKey) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '请先配置 OpenAI API Key',
        });
      }

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: input.prompt,
          n: input.n,
          size: input.size,
          quality: input.quality,
          background: input.background,
        }),
      });

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorJson = await response.json();
          errorMessage = errorJson.error?.message || `HTTP ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}`;
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `OpenAI 生图 API 错误: ${errorMessage}`,
        });
      }

      const json = await response.json();
      const images: string[] = json.data.map((d: { b64_json?: string; url?: string }) => {
        if (d.b64_json) return d.b64_json;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'API 返回格式异常，缺少图片数据',
        });
      });

      return { images };
    }),

  generateCopy: protectedProcedure
    .input(
      z.object({
        productName: z.string().min(1, '请输入商品名称').max(200),
        sellingPoints: z.string().min(1, '请输入核心卖点').max(2000),
        platform: z.enum(['taobao', 'douyin', 'xiaohongshu', 'pdd', 'general']).default('general'),
        style: z.enum(['professional', 'casual', 'luxury', 'youthful']).default('professional'),
        brandTone: z.string().max(200).optional(),
        apiKey: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const apiKey = input.apiKey || process.env.OPENAI_API_KEY || '';
      if (!apiKey) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '请先配置 OpenAI API Key',
        });
      }

      const platformPrompts: Record<string, string> = {
        taobao: '淘宝风格：标题含关键词堆砌，突出促销信息，详情文案分段清晰',
        douyin: '抖音风格：口语化、有感染力、适合短视频口播，突出痛点和解决方案',
        xiaohongshu: '小红书风格：种草笔记风，真实体验感，善用 emoji 和分段标题',
        pdd: '拼多多风格：突出性价比、低价、优惠力度，简洁直接',
        general: '通用电商风格：专业、简洁、突出商品价值',
      };

      const stylePrompts: Record<string, string> = {
        professional: '专业正式',
        casual: '轻松亲切',
        luxury: '高端奢华',
        youthful: '年轻活力',
      };

      const brandToneLine = input.brandTone ? `\n- 品牌语气：${input.brandTone}` : '';
      const systemPrompt = `你是一个专业的电商文案撰写专家。请根据以下要求生成文案：
- 平台：${platformPrompts[input.platform]}
- 风格：${stylePrompts[input.style]}${brandToneLine}
- 输出格式要求：严格按 JSON 格式返回，包含 title（标题，30字内）、description（详情文案，200-500字）、tags（5个关键词标签数组）`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `商品名称：${input.productName}\n核心卖点：${input.sellingPoints}`,
            },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorJson = await response.json();
          errorMessage = errorJson.error?.message || `HTTP ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}`;
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `OpenAI 文案 API 错误: ${errorMessage}`,
        });
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'API 未返回文案内容',
        });
      }

      try {
        const parsed = JSON.parse(content);
        return {
          title: parsed.title || '',
          description: parsed.description || '',
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        };
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'API 返回格式异常，无法解析文案',
        });
      }
    }),

  generateEcommerceDetailSet: protectedProcedure
    .input(
      z.object({
        productName: z.string().min(1, '请输入产品名称').max(200),
        sellingPoints: z.string().max(2000).optional(),
        platform: z.enum(['taobao', 'douyin', 'xiaohongshu', 'pdd', 'general']).default('taobao'),
        language: z.enum(['zh-CN', 'en']).default('zh-CN'),
        style: z.enum(['professional', 'warm', 'premium', 'minimal']).default('warm'),
        imageQuality: z.enum(['low', 'medium', 'high', 'auto']).default('medium'),
        pageCount: z.number().int().min(1).max(12).default(1),
        provider: z.enum(['packy', 'openai', 'volcengine', 'aliyun']).default('packy'),
        apiKey: z.string().optional(),
        images: z.array(z.string().min(1)).max(3).optional(),
        referenceImages: z
          .array(
            z.object({
              storageKey: z.string().min(1),
              mimeType: z.string().refine((value) => value.startsWith('image/')),
              fileName: z.string().optional(),
              size: z.number().int().positive().optional(),
            }),
          )
          .max(3)
          .optional(),
      })
        .refine((value) => getReferenceImages(value).length > 0, {
          message: '璇蜂笂浼犺嚦灏?1 寮犲弬鑰冨浘',
          path: ['referenceImages'],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const startedAt = Date.now();
      const referenceImages = getReferenceImages(input);
      assertReferenceImageOwnership(ctx.userId, referenceImages);
      const primaryReferenceImage = referenceImages[0];
      aiLog('request.start', {
        provider: input.provider,
        pageCount: input.pageCount,
        imageQuality: input.imageQuality,
        imageCount: referenceImages.length,
        platform: input.platform,
      });
      const job = await prisma.aiGenerationJob.create({
        data: {
          userId: ctx.userId,
          toolId: 'ai-ecommerce-detail-gen',
          requestType: 'ecommerce-detail',
          provider: input.provider,
          model: modelForProvider(input.provider, 'image'),
          productName: input.productName,
          platform: input.platform,
          style: input.style,
          status: 'running',
          pageCount: input.pageCount,
          inputImageCount: referenceImages.length,
          requestPayload: safeStringify(sanitizeDetailRequest(input)),
        },
      });
      const jobId = job.id;
      let activeUsage: {
        provider: string;
        model: string;
        operation: string;
        promptChars: number;
        inputImageCount: number;
        outputImageCount: number;
        startedAt: number;
        metadata?: Record<string, unknown>;
      } | null = null;

      try {
      if (input.provider !== 'openai' && input.provider !== 'packy') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${input.provider} Provider 接口已预留，当前版本先支持 PackyAPI 和 OpenAI。`,
        });
      }

      const apiKey =
        input.apiKey ||
        (input.provider === 'packy' ? process.env.PACKY_API_KEY : process.env.OPENAI_API_KEY) ||
        '';
      if (!apiKey) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `请先配置 ${input.provider === 'packy' ? 'PackyAPI' : 'OpenAI'} API Key`,
        });
      }

      const planStartedAt = Date.now();
      activeUsage = {
        provider: input.provider === 'packy' ? 'mimo' : 'openai',
        model: modelForProvider(input.provider, 'plan'),
        operation: 'detail-plan',
        promptChars: input.productName.length + (input.sellingPoints?.length ?? 0),
        inputImageCount: input.provider === 'openai' ? referenceImages.length : 0,
        outputImageCount: 0,
        startedAt: planStartedAt,
      };
      const planningImages =
        input.provider === 'openai'
          ? await Promise.all(referenceImages.slice(0, 3).map(referenceImageToDataUrl))
          : [];
      const plan =
        input.provider === 'packy'
          ? await generateMimoDetailPlan({
            productName: input.productName,
            sellingPoints: input.sellingPoints,
            platform: input.platform,
            language: input.language,
            style: input.style,
            pageCount: input.pageCount,
            images: [],
          })
          : await generateOpenAiDetailPlan({
            apiKey,
            productName: input.productName,
            sellingPoints: input.sellingPoints,
            platform: input.platform,
            language: input.language,
            style: input.style,
            pageCount: input.pageCount,
            images: planningImages,
          });
      await prisma.aiProviderUsage.create({
        data: {
          userId: ctx.userId,
          jobId,
          provider: input.provider === 'packy' ? 'mimo' : 'openai',
          model: modelForProvider(input.provider, 'plan'),
          operation: 'detail-plan',
          status: 'success',
          promptChars: input.productName.length + (input.sellingPoints?.length ?? 0),
          inputImageCount: input.provider === 'openai' ? referenceImages.length : 0,
          outputImageCount: 0,
          duration: Date.now() - planStartedAt,
          metadata: safeStringify({
            pageCount: plan.pages.length,
            productSummary: plan.productSummary,
          }),
        },
      });
      activeUsage = null;

      const pages = [];
      for (const page of plan.pages) {
        aiLog('page.image.start', {
          provider: input.provider,
          pageId: page.id,
          pageType: page.type,
        });
        const prompt = [
          pageTypeRichnessInstruction(page.type),
          page.scenePrompt,
          page.productInstruction,
          page.negativePrompt ? `Negative constraints: ${page.negativePrompt}` : '',
          `Create a premium ecommerce product detail visual for ${input.productName}.`,
          'Strict product fidelity is mandatory: preserve the reference product as the main subject, including same color, material, handles, key structure, visible parts, and proportions.',
          'Make the image richer through believable environment, props, lighting, composition, and depth, not by changing the product itself.',
          'Do not include any readable text, labels, logos, watermarks, UI, or captions in the generated image.',
          'Leave intentional clean space for later overlay typography and callout lines; avoid placing important product parts under those empty zones.',
          'Vertical 2:3 composition, commercial product photography, sharp focus, realistic lighting.',
        ].join('\n');

        const imageStartedAt = Date.now();
        activeUsage = {
          provider: input.provider,
          model: modelForProvider(input.provider, 'image'),
          operation: 'detail-image',
          promptChars: prompt.length,
          inputImageCount: primaryReferenceImage ? 1 : 0,
          outputImageCount: 0,
          startedAt: imageStartedAt,
          metadata: { pageId: page.id, pageType: page.type },
        };
        const imageBase64 =
          input.provider === 'packy'
            ? await callPackyImageGeneration({
              apiKey,
              prompt,
              quality: input.imageQuality,
              referenceImage: primaryReferenceImage,
            })
            : await callOpenAiImageGeneration({
              apiKey,
              prompt,
              referenceImage: primaryReferenceImage,
            });
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        await prisma.aiProviderUsage.create({
          data: {
            userId: ctx.userId,
            jobId,
            provider: input.provider,
            model: modelForProvider(input.provider, 'image'),
            operation: 'detail-image',
            status: 'success',
            promptChars: prompt.length,
            inputImageCount: primaryReferenceImage ? 1 : 0,
            outputImageCount: 1,
            duration: Date.now() - imageStartedAt,
            metadata: safeStringify({
              pageId: page.id,
              pageType: page.type,
              imageBytesApprox: imageBuffer.byteLength,
            }),
          },
        });
        activeUsage = null;

        const fileName = `${page.id || page.type}.png`;
        const stored = await writeAiAssetBuffer({
          prefix: `jobs/${jobId}`,
          buffer: imageBuffer,
          mimeType: 'image/png',
          fileName,
        });
        const asset = await prisma.aiGenerationAsset.create({
          data: {
            jobId,
            assetType: 'image',
            pageId: page.id,
            pageType: page.type,
            fileName,
            mimeType: 'image/png',
            size: stored.size,
            storageKey: stored.storageKey,
            prompt,
            metadata: safeStringify({
              title: page.title,
              subtitle: page.subtitle,
              bullets: page.bullets,
              hotspots: page.hotspots,
            }),
          },
        });
        pages.push({
          ...page,
          imageAssetId: asset.id,
          imageUrl: `/api/ai-assets/${asset.id}`,
        });
        aiLog('page.image.success', {
          provider: input.provider,
          pageId: page.id,
          pageType: page.type,
        });
      }

      await prisma.aiGenerationJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          duration: Date.now() - startedAt,
          outputCount: pages.length,
          resultSummary: plan.productSummary,
        },
      });

      aiLog('request.success', {
        provider: input.provider,
        pageCount: pages.length,
        durationMs: Date.now() - startedAt,
      });
      return {
        productSummary: plan.productSummary,
        pages,
        jobId,
      };
      } catch (e) {
        if (activeUsage) {
          await prisma.aiProviderUsage.create({
            data: {
              userId: ctx.userId,
              jobId,
              provider: activeUsage.provider,
              model: activeUsage.model,
              operation: activeUsage.operation,
              status: 'failed',
              promptChars: activeUsage.promptChars,
              inputImageCount: activeUsage.inputImageCount,
              outputImageCount: activeUsage.outputImageCount,
              duration: Date.now() - activeUsage.startedAt,
              errorMessage: e instanceof Error ? e.message : String(e),
              metadata: activeUsage.metadata ? safeStringify(activeUsage.metadata) : undefined,
            },
          });
        }
        await prisma.aiGenerationJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            duration: Date.now() - startedAt,
            errorMessage: e instanceof Error ? e.message : String(e),
          },
        });
        throw e;
      }
    }),
});
