import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
// PAKEISTA: Importuojame Google
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db";

// ... (declare module dalis lieka tokia pati) ...

export const authConfig = {
  providers: [
    // PAKEISTA: Naudojame GoogleProvider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
} satisfies NextAuthConfig;