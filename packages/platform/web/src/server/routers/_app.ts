import { router } from '../trpc';
import { aiRouter } from './ai';
import { docRouter } from './doc';
import { userRouter } from './user';

export const appRouter = router({
  ai: aiRouter,
  doc: docRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
