import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';

export const aiRouter = router({
  removeBg: protectedProcedure
    .input(
      z.object({
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

      const systemPrompt = `你是一个专业的电商文案撰写专家。请根据以下要求生成文案：
- 平台：${platformPrompts[input.platform]}
- 风格：${stylePrompts[input.style]}
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
});
