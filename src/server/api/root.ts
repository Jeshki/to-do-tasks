// jeshki/to-do-tasks/to-do-tasks-bb0fe0bbbcd5b0d7ad5a809bba28060e07bc0b85/src/server/api/root.ts

import { adminRouter } from "~/server/api/routers/admin";
import { boardRouter } from "~/server/api/routers/board"; // <--- Paliekame tik boardRouter
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  board: boardRouter, // <--- Paliekame tik board router
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);