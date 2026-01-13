import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "../trpc";

export const adminRouter = createTRPCRouter({
  listUsers: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: [{ role: "asc" }, { email: "asc" }],
    });
    return users;
  }),

  createUser: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().trim().min(1).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const existing = await ctx.db.user.findUnique({ where: { email } });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "User already exists" });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const user = await ctx.db.user.create({
        data: {
          email,
          name: input.name ?? null,
          role: "EMPLOYEE",
          passwordHash,
        },
        select: { id: true, email: true, name: true, role: true },
      });
      return user;
    }),

  resetUserPassword: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const passwordHash = await bcrypt.hash(input.password, 12);
      await ctx.db.user.update({
        where: { id: input.userId },
        data: { passwordHash },
      });
      return { success: true };
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete your own user" });
      }

      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, role: true },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (target.role === "ADMIN") {
        const adminCount = await ctx.db.user.count({ where: { role: "ADMIN" } });
        if (adminCount <= 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete last admin" });
        }
      }

      await ctx.db.user.delete({ where: { id: input.userId } });
      return { success: true };
    }),
});
