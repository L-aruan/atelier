import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { verifyToken } from '@/server/auth';
import type { Context } from '@/server/trpc';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async (): Promise<Context> => {
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) return {};
      const token = authHeader.slice(7);
      const payload = await verifyToken(token);
      return payload ? { userId: payload.userId } : {};
    },
  });

export { handler as GET, handler as POST };
