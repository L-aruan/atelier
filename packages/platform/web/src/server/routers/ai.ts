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
});
