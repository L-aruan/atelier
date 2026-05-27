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

  // User workflows
  saveWorkflow: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        description: z.string().default(''),
        steps: z.string(), // JSON string
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        const existing = await prisma.userWorkflow.findFirst({
          where: { id: input.id, userId: ctx.userId },
        });
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '工作流不存在' });
        }
        const updated = await prisma.userWorkflow.update({
          where: { id: input.id },
          data: { name: input.name, description: input.description, steps: input.steps },
        });
        return { id: updated.id };
      }
      const created = await prisma.userWorkflow.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          description: input.description,
          steps: input.steps,
        },
      });
      return { id: created.id };
    }),

  listWorkflows: protectedProcedure.query(async ({ ctx }) => {
    const workflows = await prisma.userWorkflow.findMany({
      where: { userId: ctx.userId },
      orderBy: { updatedAt: 'desc' },
    });
    return workflows;
  }),

  deleteWorkflow: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.userWorkflow.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '工作流不存在' });
      }
      await prisma.userWorkflow.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  // User API keys
  saveApiKey: protectedProcedure
    .input(
      z.object({
        provider: z.string().min(1),
        key: z.string().min(1),
        label: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.userApiKey.findUnique({
        where: { userId_provider: { userId: ctx.userId, provider: input.provider } },
      });
      if (existing) {
        const updated = await prisma.userApiKey.update({
          where: { id: existing.id },
          data: { key: input.key, label: input.label },
        });
        return { id: updated.id };
      }
      const created = await prisma.userApiKey.create({
        data: {
          userId: ctx.userId,
          provider: input.provider,
          key: input.key,
          label: input.label,
        },
      });
      return { id: created.id };
    }),

  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const keys = await prisma.userApiKey.findMany({
      where: { userId: ctx.userId },
      select: { id: true, provider: true, label: true, createdAt: true },
    });
    return keys;
  }),

  deleteApiKey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.userApiKey.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'API Key 不存在' });
      }
      await prisma.userApiKey.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
