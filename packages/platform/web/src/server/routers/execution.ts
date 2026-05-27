import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '../db';

export const executionRouter = router({
  record: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        workflowName: z.string(),
        totalFiles: z.number().int().min(0),
        successCount: z.number().int().min(0),
        failCount: z.number().int().min(0),
        skippedCount: z.number().int().min(0),
        duration: z.number().int().min(0),
        status: z.enum(['completed', 'failed', 'partial']),
        stepDetails: z.string(), // JSON string
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const run = await prisma.workflowRun.create({
        data: {
          userId: ctx.userId,
          ...input,
        },
      });
      return { id: run.id };
    }),

  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(10),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const runs = await prisma.workflowRun.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (runs.length > input.limit) {
        const next = runs.pop();
        nextCursor = next?.id;
      }

      return { runs, nextCursor };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const run = await prisma.workflowRun.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!run) {
        return null;
      }
      return run;
    }),
});
