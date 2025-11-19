import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, User } from "next-auth"; 
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db";
import { env } from "~/env";

// PATAISYMAS: Paruošiame leidžiamų e-pašto adresų sąrašą.
// Išskiriame adresus iš aplinkos kintamojo.
const allowedEmails = env.ALLOWED_EMAILS
    ? env.ALLOWED_EMAILS.split(',').map((email: string) => email.trim().toLowerCase()).filter((email: string) => email.length > 0)
    : null;

// Providers iškėlimas ir cast'inimas į 'any'
const authProviders = [
    GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
] as any[];


/**
 * Module augmentation for `next-auth` types.
 */
declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id: string;
        } & DefaultSession["user"];
    }

    interface User {
        id: string; // Užtikriname, kad User turi id
    }
}


export const authConfig = {
    secret: env.NEXTAUTH_SECRET,
    providers: authProviders,
    adapter: PrismaAdapter(db),
    callbacks: {
        // PATAISYMAS: Valdome prisijungimo leidimą
        signIn: ({ user, account }: any) => { 
            // 1. Jei leidžiamų el. pašto adresų sąrašas (ALLOWED_EMAILS) NĖRA nustatytas ar yra tuščias,
            // grąžiname TRUE, leisdami prisijungti visiems.
            if (!allowedEmails || allowedEmails.length === 0) {
                return true;
            }

            // 2. Jei sąrašas NUSTATYTAS, tikriname, ar vartotojo el. paštas yra jame.
            if (account?.provider === 'google' && user?.email) {
                const userEmail = user.email.toLowerCase();
                return allowedEmails.includes(userEmail);
            }

            // Jei sąrašas nustatytas ir el. pašto adresas nerastas jame, prisijungimas blokuojamas.
            return false;
        },

        // Sesijos callback'as
        session: ({ session, user }: { session: DefaultSession, user: User }) => ({
            ...session,
            user: {
                ...session.user,
                id: user.id,
            },
        }),
    },
};