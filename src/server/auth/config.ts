import { PrismaAdapter } from "@auth/prisma-adapter";
import type { UserRole } from "@prisma/client";
import type { DefaultSession, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { db } from "~/server/db";
import { env } from "~/env";

declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id: string;
            role: UserRole;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        role: UserRole;
    }
}

export const authConfig = (() => {
    const allowedEmails = env.ALLOWED_EMAILS
        ? env.ALLOWED_EMAILS.split(",")
              .map((email: string) => email.trim().toLowerCase())
              .filter((email: string) => email.length > 0)
        : null;

    const adminEmails = env.ADMIN_EMAILS
        ? env.ADMIN_EMAILS.split(",")
              .map((email: string) => email.trim().toLowerCase())
              .filter((email: string) => email.length > 0)
        : null;

    const isAdminEmail = (email?: string | null) => {
        if (!email || !adminEmails || adminEmails.length === 0) return false;
        return adminEmails.includes(email.trim().toLowerCase());
    };

    const resolveRole = (email?: string | null, fallbackRole?: UserRole) => {
        if (!adminEmails || adminEmails.length === 0) {
            return (fallbackRole ?? "EMPLOYEE") as UserRole;
        }
        return (isAdminEmail(email) ? "ADMIN" : "EMPLOYEE") as UserRole;
    };

    const providers = [
        CredentialsProvider({
            name: "Email + Password",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "you@example.com" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                const emailValue = credentials?.email;
                const passwordValue = credentials?.password;
                const email = typeof emailValue === "string" ? emailValue.toLowerCase().trim() : undefined;
                const password = typeof passwordValue === "string" ? passwordValue : undefined;

                if (!email || !password) {
                    if (process.env.NODE_ENV !== "production") {
                        console.warn("[auth] Missing email or password");
                    }
                    return null;
                }

                const user = await db.user.findUnique({ where: { email } });
                if (allowedEmails && allowedEmails.length > 0 && !allowedEmails.includes(email) && !user) {
                    if (process.env.NODE_ENV !== "production") {
                        console.warn("[auth] Email not allowed", { email });
                    }
                    return null;
                }
                if (!user?.passwordHash) {
                    if (process.env.NODE_ENV !== "production") {
                        console.warn("[auth] User not found or missing passwordHash", { email });
                    }
                    return null;
                }

                const isValid = await bcrypt.compare(password, user.passwordHash);
                if (!isValid) {
                    if (process.env.NODE_ENV !== "production") {
                        console.warn("[auth] Invalid password", { email });
                    }
                    return null;
                }

                const role = resolveRole(email, user.role);

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role,
                };
            },
        }),
    ] as any[];

    return {
        secret: env.NEXTAUTH_SECRET,
        providers,
        adapter: PrismaAdapter(db),
        session: {
            strategy: "jwt" as const,
        },
        pages: {
            signIn: "/signin",
            error: "/signin",
        },
        callbacks: {
            jwt: ({ token, user }: any) => {
                if (user?.id) {
                    token.id = user.id;
                }
                if (user?.role) {
                    token.role = user.role;
                }
                if (user?.email) {
                    token.email = user.email;
                }
                const tokenEmail =
                    typeof token.email === "string" ? token.email.trim().toLowerCase() : undefined;
                token.role = resolveRole(tokenEmail, token.role);
                return token;
            },
            session: ({ session, token }: any) => {
                const sessionEmail =
                    typeof session.user?.email === "string"
                        ? session.user.email.trim().toLowerCase()
                        : typeof token.email === "string"
                          ? token.email.trim().toLowerCase()
                          : undefined;
                const role = resolveRole(sessionEmail, token.role);
                return {
                    ...session,
                    user: {
                        ...session.user,
                        id: token.id ?? token.sub,
                        role,
                    },
                };
            },
        },
    };
})();
