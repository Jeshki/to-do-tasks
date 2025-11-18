import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const boardRouter = createTRPCRouter({
  // 1. Gauti visą lentą (su nuotraukomis)
  getBoard: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.category.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        photos: true,
        tasks: {
          include: {
            comments: true,
            photos: true,
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });
  }),

  // 2. Sukurti kategoriją
  createCategory: protectedProcedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const lastCategory = await ctx.db.category.findFirst({
        where: { userId: ctx.session.user.id },
        orderBy: { order: "desc" },
      });
      const newOrder = lastCategory ? lastCategory.order + 1 : 0;

      return ctx.db.category.create({
        data: {
          title: input.title,
          userId: ctx.session.user.id,
          order: newOrder,
        },
      });
    }),

  // 3. Sukurti užduotį
  createTask: protectedProcedure
    .input(z.object({ 
      title: z.string().min(1),
      categoryId: z.string() 
    }))
    .mutation(async ({ ctx, input }) => {
      // Autorizacija: užtikrinti, kad vartotojas yra kategorijos, kurioje kuriama užduotis, savininkas.
      const category = await ctx.db.category.findFirst({
        where: {
          id: input.categoryId,
          userId: ctx.session.user.id,
        },
      });

      if (!category) {
        throw new Error("Category not found or you don't have permission to create a task in it.");
      }

      // Surandame paskutinę užduotį, kad nustatytume naujos užduoties tvarką
      const lastTask = await ctx.db.task.findFirst({
        where: { categoryId: input.categoryId },
        orderBy: { order: "desc" },
      });
      const newOrder = lastTask ? lastTask.order + 1 : 0;

      return ctx.db.task.create({
        data: {
          title: input.title,
          categoryId: input.categoryId,
          order: newOrder,
        },
      });
    }),

  // 4. Ištrinti užduotį
  deleteTask: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Autorizacija: užtikrinti, kad vartotojas yra užduoties savininkas.
      const task = await ctx.db.task.findFirst({
        where: {
          id: input.id,
          category: {
            userId: ctx.session.user.id,
          },
        },
      });

      if (!task) {
        throw new Error("Task not found or you don't have permission to delete it.");
      }

      // Naudojame transakciją, kad ištrintume užduotį ir atnaujintume kitų užduočių tvarką
      const deletedTask = await ctx.db.$transaction(async (tx) => {
        // 1. Ištriname užduotį
        const deleted = await tx.task.delete({
          where: { id: task.id },
        });

        // 2. Atnaujiname vėliau einančių užduočių tvarką toje pačioje kategorijoje
        await tx.task.updateMany({
          where: {
            categoryId: task.categoryId,
            order: { gt: task.order },
          },
          data: { order: { decrement: 1 } },
        });

        return deleted;
      });
      return deletedTask;
    }),

  // 5. Atnaujinti užduoties poziciją (patobulinta logika)
  updateTaskPosition: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      sourceCategoryId: z.string(),
      newCategoryId: z.string(),
      oldOrder: z.number(),
      newOrder: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Authorization: Ensure the user owns the task they are moving.
      const taskToMove = await ctx.db.task.findFirst({
        where: {
          id: input.taskId,
          category: { userId: ctx.session.user.id },
        },
      });

      if (!taskToMove) {
        throw new Error("Task not found or you don't have permission to move it.");
      }

      return ctx.db.$transaction(async (tx) => {
        // 1. Remove task from old position by decrementing order of subsequent tasks
        await tx.task.updateMany({
          where: {
            categoryId: input.sourceCategoryId,
            order: { gt: input.oldOrder },
          },
          data: { order: { decrement: 1 } },
        });

        // 2. Make space for task in new position by incrementing order of subsequent tasks
        await tx.task.updateMany({
          where: {
            categoryId: input.newCategoryId,
            order: { gte: input.newOrder },
          },
          data: { order: { increment: 1 } },
        });

        // 3. Update the task's position and category
        const updatedTask = await tx.task.update({
          where: { id: input.taskId },
          data: {
            categoryId: input.newCategoryId,
            order: input.newOrder,
          },
        });

        return updatedTask;
      });
    }),

  // 6. Pridėti nuotrauką kategorijai
  addPhotoToCategory: protectedProcedure
    .input(z.object({ categoryId: z.string(), url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Autorizacija: užtikrinti, kad vartotojas yra kategorijos savininkas.
      const category = await ctx.db.category.findFirst({
        where: {
          id: input.categoryId,
          userId: ctx.session.user.id,
        },
      });

      if (!category) {
        throw new Error("Category not found or you don't have permission to add a photo to it.");
      }

      return ctx.db.photo.create({
        data: {
          url: input.url,
          categoryId: input.categoryId,
        },
      });
    }),

  // 7. Pridėti nuotrauką užduočiai
  addPhotoToTask: protectedProcedure
    .input(z.object({ taskId: z.string(), url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Autorizacija: užtikrinti, kad vartotojas yra užduoties savininkas.
      const task = await ctx.db.task.findFirst({
        where: {
          id: input.taskId,
          category: {
            userId: ctx.session.user.id,
          },
        },
      });

      if (!task) {
        throw new Error("Task not found or you don't have permission to add a photo to it.");
      }

      return ctx.db.photo.create({
        data: {
          url: input.url,
          taskId: input.taskId,
        },
      });
    }),

  // 8. Ištrinti kategoriją
  deleteCategory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Autorizacija: užtikrinti, kad vartotojas yra kategorijos savininkas.
      const category = await ctx.db.category.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!category) {
        throw new Error("Category not found or you don't have permission to delete it.");
      }

      // Naudojame transakciją, kad ištrintume kategoriją ir atnaujintume kitų kategorijų tvarką.
      // `onDelete: Cascade` Prisma schemoje pasirūpins susijusių užduočių ištrynimu.
      return ctx.db.$transaction(async (tx) => {
        // 1. Ištriname kategoriją
        const deletedCategory = await tx.category.delete({
          where: { id: input.id },
        });

        // 2. Atnaujiname vėliau einančių kategorijų tvarką
        await tx.category.updateMany({
          where: {
            userId: ctx.session.user.id,
            order: { gt: category.order },
          },
          data: { order: { decrement: 1 } },
        });

        return deletedCategory;
      });
    }),
});