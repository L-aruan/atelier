import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma } from '../db';
import { hashPassword, verifyPassword, createToken } from '../auth';

export const userRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.email(),
        password: z.string().min(6),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: '该邮箱已注册' });

      const hashed = await hashPassword(input.password);
      const user = await prisma.user.create({
        data: { email: input.email, password: hashed, name: input.name },
      });

      const token = await createToken(user.id);
      return { token, user: { id: user.id, email: user.email, name: user.name } };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.email(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { email: input.email } });
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: '邮箱或密码错误' });

      const valid = await verifyPassword(input.password, user.password);
      if (!valid) throw new TRPCError({ code: 'UNAUTHORIZED', message: '邮箱或密码错误' });

      const token = await createToken(user.id);
      return { token, user: { id: user.id, email: user.email, name: user.name } };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: '用户不存在' });
    return user;
  }),

  // Pinned tools
  getPinnedTools: protectedProcedure.query(async ({ ctx }) => {
    const pinned = await prisma.pinnedTool.findMany({
      where: { userId: ctx.userId },
      orderBy: { order: 'asc' },
    });
    return pinned.map((p) => p.toolId);
  }),

  pinTool: protectedProcedure
    .input(z.object({ toolId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.pinnedTool.findUnique({
        where: { userId_toolId: { userId: ctx.userId, toolId: input.toolId } },
      });
      if (existing) {
        await prisma.pinnedTool.delete({ where: { id: existing.id } });
        return { pinned: false };
      }
      const maxOrder = await prisma.pinnedTool.aggregate({
        where: { userId: ctx.userId },
        _max: { order: true },
      });
      await prisma.pinnedTool.create({
        data: { userId: ctx.userId, toolId: input.toolId, order: (maxOrder._max.order ?? -1) + 1 },
      });
      return { pinned: true };
    }),

  // Recent tools
  getRecentTools: protectedProcedure.query(async ({ ctx }) => {
    const recent = await prisma.recentTool.findMany({
      where: { userId: ctx.userId },
      orderBy: { usedAt: 'desc' },
      take: 20,
    });
    return recent.map((r) => ({ toolId: r.toolId, lastUsed: r.usedAt.getTime(), count: r.count }));
  }),

  recordToolUse: protectedProcedure
    .input(z.object({ toolId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.recentTool.findUnique({
        where: { userId_toolId: { userId: ctx.userId, toolId: input.toolId } },
      });
      if (existing) {
        await prisma.recentTool.update({
          where: { id: existing.id },
          data: { usedAt: new Date(), count: existing.count + 1 },
        });
      } else {
        await prisma.recentTool.create({
          data: { userId: ctx.userId, toolId: input.toolId },
        });
      }
      return { ok: true };
    }),
});
