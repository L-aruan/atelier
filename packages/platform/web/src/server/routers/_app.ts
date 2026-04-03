import { router } from '../trpc';
import { aiRouter } from './ai';
import { userRouter } from './user';

export const appRouter = router({
  ai: aiRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
