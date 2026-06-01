import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '../db';

export const aiHistoryRouter = router({
  listJobs: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
        cursor: z.string().optional(),
        toolId: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const jobs = await prisma.aiGenerationJob.findMany({
        where: {
          userId: ctx.userId,
          toolId: input.toolId,
          status: input.status,
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          _count: {
            select: {
              assets: true,
              providerUsages: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (jobs.length > input.limit) {
        const next = jobs.pop();
        nextCursor = next?.id;
      }

      return { jobs, nextCursor };
    }),

  getJob: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.aiGenerationJob.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        include: {
          assets: { orderBy: { createdAt: 'asc' } },
          providerUsages: { orderBy: { createdAt: 'asc' } },
        },
      });
    }),

  listProviderUsage: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(),
        provider: z.string().optional(),
        operation: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const usages = await prisma.aiProviderUsage.findMany({
        where: {
          userId: ctx.userId,
          provider: input.provider,
          operation: input.operation,
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (usages.length > input.limit) {
        const next = usages.pop();
        nextCursor = next?.id;
      }

      return { usages, nextCursor };
    }),
});
