import { postRouter } from "~/server/api/routers/post";
import { boardRouter } from "~/server/api/routers/board"; // <--- Importuojame
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  post: postRouter, // Galite palikti arba ištrinti seną
  board: boardRouter, // <--- Pridedame naują
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);