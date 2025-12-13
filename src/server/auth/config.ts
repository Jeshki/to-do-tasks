import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, User } from "next-auth"; 
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db";
import { env } from "~/env";

// SVARBU: Kodo logika perkelta į IIFE (Immediately Invoked Function Expression)
// kad atidėtų env kintamųjų skaitymą iki vykdymo laiko ir išvengtų Turbopack klaidų.

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


export const authConfig = (() => {
    
    // Providers masyvas inicializuojamas čia, kad kintamieji būtų skaitomi runtime metu
    const providers = [
        GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
        }),
    ] as any[];

    return {
        secret: env.NEXTAUTH_SECRET,
        providers: providers,
        
        adapter: PrismaAdapter(db),
        callbacks: {
            // PATAISYMAS: Valdome prisijungimo leidimą
            signIn: ({ user, account }: any) => { 
                // Perkeliame allowedEmails logiką į vidų, kad būtų prieinama tik serveryje (runtime)
                const allowedEmails = env.ALLOWED_EMAILS
                    ? env.ALLOWED_EMAILS.split(',').map((email: string) => email.trim().toLowerCase()).filter((email: string) => email.length > 0)
                    : null;
                
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
})(); // IIFE kvietimas