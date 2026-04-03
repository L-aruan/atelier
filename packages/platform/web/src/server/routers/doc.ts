import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const docRouter = router({
  formatBrush: publicProcedure
    .input(
      z.object({
        templateBase64: z.string(),
        targetBase64: z.string(),
        options: z.object({
          pageSetup: z.boolean(),
          docDefaults: z.boolean(),
          styles: z.boolean(),
          headerFooter: z.boolean(),
          numbering: z.boolean(),
          clearParaFormat: z.boolean(),
          clearCharFormat: z.boolean(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const { applyFormat } = await import('@atelier/tool-doc-format-brush/src/engine');

      const templateBuffer = Buffer.from(input.templateBase64, 'base64');
      const targetBuffer = Buffer.from(input.targetBase64, 'base64');

      const templateAb = templateBuffer.buffer.slice(
        templateBuffer.byteOffset,
        templateBuffer.byteOffset + templateBuffer.byteLength,
      );
      const targetAb = targetBuffer.buffer.slice(
        targetBuffer.byteOffset,
        targetBuffer.byteOffset + targetBuffer.byteLength,
      );

      const resultBuffer = await applyFormat(templateAb, targetAb, input.options);

      const resultBase64 = Buffer.from(new Uint8Array(resultBuffer)).toString('base64');
      return { resultBase64 };
    }),
});
