// src/server/auth/index.ts
import NextAuth from "next-auth";
import { authConfig } from "./config"; // PATAISYTA: Dabar importuojama teisinga konstanta

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);