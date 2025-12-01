import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const boardRouter = createTRPCRouter({
  // 1. Gauti visą lentą
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

  // 2. Sukurti kategoriją
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
          color: "#94a3b8", // default spalva, gali keisti vėliau
        },
      });
    }),

  // PATAISYMAS: Ištrinti kategoriją su visomis užduotimis
  deleteCategory: protectedProcedure
    .input(z.object({ categoryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.db.category.findFirst({
        where: { id: input.categoryId, userId: ctx.session.user.id },
      });
      if (!category) throw new Error("Kategorija nerasta");

      await ctx.db.$transaction(async (tx) => {
        // Ištrina visas užduotis (ir susijusias nuotraukas bei komentarus dėl CASCADE)
        await tx.category.delete({ where: { id: category.id } });

        // Sutvarko likusių kategorijų order (eilės numerius)
        await tx.category.updateMany({
          where: { userId: ctx.session.user.id, order: { gt: category.order } },
          data: { order: { decrement: 1 } },
        });
      });

      return { success: true };
    }),


  // 3. Sukurti užduotį
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

  // 4. Ištrinti užduotį + sutvarkyti order
  deleteTask: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findFirst({
        where: { id: input.id, category: { userId: ctx.session.user.id } },
      });
      if (!task) throw new Error("Užduotis nerasta");

      await ctx.db.$transaction(async (tx) => {
        await tx.task.delete({ where: { id: task.id } });

        await tx.task.updateMany({
          where: { categoryId: task.categoryId, order: { gt: task.order } },
          data: { order: { decrement: 1 } },
        });
      });

      return { success: true };
    }),

  // PATAISYMAS: Atnaujinti užduoties pavadinimą ir aprašymą
  updateTaskDetails: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      createdAt: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Patikrinimas, ar užduotis priklauso vartotojui
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

  // PATAISYMAS: Perjungti užduoties atlikimo būseną
  toggleTaskCompletion: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      completed: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Patikrinimas, ar užduotis priklauso vartotojui
      await ctx.db.task.findFirstOrThrow({
        where: { id: input.taskId, category: { userId: ctx.session.user.id } },
        select: { id: true },
      });

      return await ctx.db.task.update({
        where: { id: input.taskId },
        data: { completed: input.completed },
      });
    }),

  // PATAISYMAS: Pridėti komentarą
  addCommentToTask: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      text: z.string().min(1, "Komentaras negali būti tuščias"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Patikrinimas, ar užduotis priklauso vartotojui
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

  // PATAISYMAS: Ištrinti nuotrauką
  deletePhotoFromTask: protectedProcedure
    .input(z.object({ photoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const photo = await ctx.db.photo.findFirst({
        where: { 
          id: input.photoId, 
          task: { category: { userId: ctx.session.user.id } } // Patikriname savininką per užduotį
        },
      });
      
      if (!photo) {
        throw new Error("Nuotrauka nerasta arba neturite leidimo.");
      }
      
      return await ctx.db.photo.delete({
        where: { id: input.photoId },
      });
    }),

  // 5. PAGRINDINIS: Perkelti užduotį (tarp kategorijų arba toje pačioje)
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
      if (!task) throw new Error("Užduotis nerasta");

      const oldCategoryId = task.categoryId;
      const oldOrder = task.order;

      await ctx.db.$transaction(async (tx) => {
        if (oldCategoryId !== input.newCategoryId) {
          // 1. Išvalome seną vietą
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

          // 3. Perkeliame užduotį
          await tx.task.update({
            where: { id: input.taskId },
            data: {
              categoryId: input.newCategoryId,
              order: input.newOrder,
            },
          });
        } else {
          // Toje pačioje kategorijoje
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
