import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

const COLORS = [
  "#f87171", // red-400
  "#fb923c", // orange-400
  "#fbbf24", // amber-400
  "#a3e635", // lime-400
  "#4ade80", // green-400
  "#34d399", // emerald-400
  "#2dd4bf", // teal-400
  "#67e8f9", // cyan-300
  "#60a5fa", // blue-400
  "#a78bfa", // violet-400
  "#f472b6", // pink-400
];

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]!;
}

export const postRouter = createTRPCRouter({ // PATAISYTA: Pakeista iš boardRouter į postRouter
  getBoard: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.category.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        tasks: {
          orderBy: { order: "asc" },
          include: {
            photos: true,
            comments: true,
          },
        },
      },
    });
  }),

  createCategory: protectedProcedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.category.create({
        data: {
          title: input.title,
          color: getRandomColor(),
          userId: ctx.session.user.id,
        },
      });
    }),

  updateTaskPosition: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        newCategoryId: z.string(),
        newOrder: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.task.update({
        where: { id: input.taskId },
        data: {
          categoryId: input.newCategoryId,
          order: input.newOrder,
        },
      });
    }),
});