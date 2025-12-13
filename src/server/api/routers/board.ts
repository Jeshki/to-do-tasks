import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const boardRouter = createTRPCRouter({
  // 1. Gauti vis─ģ lent─ģ
  getBoard: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.category.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        tasks: {
          include: {
            photos: true,
            comments: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });
  }),

  // 2. Sukurti kategorij─ģ
  createCategory: protectedProcedure
    .input(z.object({ title: z.string().min(1, "Pavadinimas privalomas") }))
    .mutation(async ({ ctx, input }) => {
      const lastCategory = await ctx.db.category.findFirst({
        where: { userId: ctx.session.user.id },
        orderBy: { order: "desc" },
      });

      const newOrder = lastCategory ? lastCategory.order + 1 : 0;

      return await ctx.db.category.create({
        data: {
          title: input.title,
          userId: ctx.session.user.id,
          order: newOrder,
          color: "#94a3b8", // default spalva, gali keisti v─Śliau
        },
      });
    }),

  // PATAISYMAS: I┼Ītrinti kategorij─ģ su visomis u┼Šduotimis
  deleteCategory: protectedProcedure
    .input(z.object({ categoryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.db.category.findFirst({
        where: { id: input.categoryId, userId: ctx.session.user.id },
      });
      if (!category) throw new Error("Kategorija nerasta");

      await ctx.db.$transaction(async (tx) => {
        // I┼Ītrina visas u┼Šduotis (ir susijusias nuotraukas bei komentarus d─Śl CASCADE)
        await tx.category.delete({ where: { id: category.id } });

        // Sutvarko likusi┼│ kategorij┼│ order (eil─Śs numerius)
        await tx.category.updateMany({
          where: { userId: ctx.session.user.id, order: { gt: category.order } },
          data: { order: { decrement: 1 } },
        });
      });

      return { success: true };
    }),


  // 3. Sukurti u┼Šduot─»
  createTask: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      categoryId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.db.category.findFirst({
        where: { id: input.categoryId, userId: ctx.session.user.id },
      });
      if (!category) throw new Error("Kategorija nerasta");

      const lastTask = await ctx.db.task.findFirst({
        where: { categoryId: input.categoryId },
        orderBy: { order: "desc" },
      });

      const newOrder = lastTask ? lastTask.order + 1 : 0;

      return await ctx.db.task.create({
        data: {
          title: input.title,
          categoryId: input.categoryId,
          order: newOrder,
          completed: false,
        },
      });
    }),

  // 4. I┼Ītrinti u┼Šduot─» + sutvarkyti order
  deleteTask: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findFirst({
        where: { id: input.id, category: { userId: ctx.session.user.id } },
      });
      if (!task) throw new Error("U┼Šduotis nerasta");

      await ctx.db.$transaction(async (tx) => {
        await tx.task.delete({ where: { id: task.id } });

        await tx.task.updateMany({
          where: { categoryId: task.categoryId, order: { gt: task.order } },
          data: { order: { decrement: 1 } },
        });
      });

      return { success: true };
    }),

  // PATAISYMAS: Atnaujinti u┼Šduoties pavadinim─ģ ir apra┼Īym─ģ
  updateTaskDetails: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      createdAt: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Patikrinimas, ar u┼Šduotis priklauso vartotojui
      await ctx.db.task.findFirstOrThrow({
        where: { id: input.taskId, category: { userId: ctx.session.user.id } },
        select: { id: true },
      });

      return await ctx.db.task.update({
        where: { id: input.taskId },
        data: {
          title: input.title,
          description: input.description,
          createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
        },
      });
    }),

  // PATAISYMAS: Perjungti u┼Šduoties atlikimo b┼½sen─ģ
  toggleTaskCompletion: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      completed: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Patikrinimas, ar u┼Šduotis priklauso vartotojui
      await ctx.db.task.findFirstOrThrow({
        where: { id: input.taskId, category: { userId: ctx.session.user.id } },
        select: { id: true },
      });

      return await ctx.db.task.update({
        where: { id: input.taskId },
        data: { completed: input.completed },
      });
    }),

  // PATAISYMAS: Prid─Śti komentar─ģ
  addCommentToTask: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      text: z.string().min(1, "Komentaras negali b┼½ti tu┼Ī─Źias"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Patikrinimas, ar u┼Šduotis priklauso vartotojui
      await ctx.db.task.findFirstOrThrow({
        where: { id: input.taskId, category: { userId: ctx.session.user.id } },
        select: { id: true },
      });

      return await ctx.db.comment.create({
        data: {
          text: input.text,
          taskId: input.taskId,
        },
      });
    }),

  // PATAISYMAS: I┼Ītrinti nuotrauk─ģ
  deletePhotoFromTask: protectedProcedure
    .input(z.object({ photoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const photo = await ctx.db.photo.findFirst({
        where: { 
          id: input.photoId, 
          task: { category: { userId: ctx.session.user.id } } // Patikriname savinink─ģ per u┼Šduot─»
        },
      });
      
      if (!photo) {
        throw new Error("Nuotrauka nerasta arba neturite leidimo.");
      }
      
      return await ctx.db.photo.delete({
        where: { id: input.photoId },
      });
    }),

  // 5. PAGRINDINIS: Perkelti u┼Šduot─» (tarp kategorij┼│ arba toje pa─Źioje)
  updateTaskPosition: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        newCategoryId: z.string(),
        newOrder: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findFirst({
        where: { id: input.taskId, category: { userId: ctx.session.user.id } },
        select: { categoryId: true, order: true },
      });
      if (!task) throw new Error("U┼Šduotis nerasta");

      const oldCategoryId = task.categoryId;
      const oldOrder = task.order;

      await ctx.db.$transaction(async (tx) => {
        if (oldCategoryId !== input.newCategoryId) {
          // 1. I┼Īvalome sen─ģ viet─ģ
          await tx.task.updateMany({
            where: { categoryId: oldCategoryId, order: { gt: oldOrder } },
            data: { order: { decrement: 1 } },
          });

          // 2. Padarome vietos naujoje kategorijoje
          await tx.task.updateMany({
            where: {
              categoryId: input.newCategoryId,
              order: { gte: input.newOrder },
            },
            data: { order: { increment: 1 } },
          });

          // 3. Perkeliame u┼Šduot─»
          await tx.task.update({
            where: { id: input.taskId },
            data: {
              categoryId: input.newCategoryId,
              order: input.newOrder,
            },
          });
        } else {
          // Toje pa─Źioje kategorijoje
          if (oldOrder < input.newOrder) {
            await tx.task.updateMany({
              where: {
                categoryId: oldCategoryId,
                order: { gt: oldOrder, lte: input.newOrder },
              },
              data: { order: { decrement: 1 } },
            });
          } else if (oldOrder > input.newOrder) {
            await tx.task.updateMany({
              where: {
                categoryId: oldCategoryId,
                order: { gte: input.newOrder, lt: oldOrder },
              },
              data: { order: { increment: 1 } },
            });
          }

          await tx.task.update({
            where: { id: input.taskId },
            data: { order: input.newOrder },
          });
        }
      });

      return { success: true };
    }),

  addPhotoToTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        url: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findFirst({
        where: {
          id: input.taskId,
          category: { userId: ctx.session.user.id },
        },
      });

      if (!task) {
        throw new Error("Task not found or you do not have permission.");
      }

      return await ctx.db.photo.create({
        data: {
          url: input.url,
          taskId: input.taskId,
        },
      });
    }),
});
