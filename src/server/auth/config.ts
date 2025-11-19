import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, User, Account, Profile } from "next-auth"; 
import type { AuthConfig } from "@auth/core"; 
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db";
import { env } from "~/env";

// PATAISYMAS: Paruošiame leidžiamų e-pašto adresų sąrašą.
const allowedEmails = env.ALLOWED_EMAILS
    ? env.ALLOWED_EMAILS.split(',').map((email: string) => email.trim().toLowerCase()).filter((email: string) => email.length > 0)
    : null;

// PATAISYMAS: Providers iškėlimas ir cast'inimas į 'any' (paliekama, kaip buvo pataisyta anksčiau)
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
        // PATAISYMAS: Naudojame 'any' signIn callback'o parametrams, kad išvengtume kompiliavimo klaidų.
        signIn: ({ user, account }: any) => { 
            if (!allowedEmails || allowedEmails.length === 0) {
                return true;
            }

            if (account?.provider === 'google' && user?.email) {
                const userEmail = user.email.toLowerCase();
                return allowedEmails.includes(userEmail);
            }

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