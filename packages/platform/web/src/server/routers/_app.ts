import { router } from '../trpc';
import { aiRouter } from './ai';
import { docRouter } from './doc';
import { userRouter } from './user';
import { executionRouter } from './execution';

export const appRouter = router({
  ai: aiRouter,
  doc: docRouter,
  user: userRouter,
  execution: executionRouter,
});

export type AppRouter = typeof appRouter;
