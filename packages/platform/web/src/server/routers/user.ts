import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
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
      if (existing) throw new Error('该邮箱已注册');

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
      if (!user) throw new Error('邮箱或密码错误');

      const valid = await verifyPassword(input.password, user.password);
      if (!valid) throw new Error('邮箱或密码错误');

      const token = await createToken(user.id);
      return { token, user: { id: user.id, email: user.email, name: user.name } };
    }),

  me: publicProcedure.query(async () => {
    // This will be enhanced later with actual token extraction from headers
    return null;
  }),
});
