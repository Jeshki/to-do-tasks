/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "~/server/auth";
import { env } from "~/env";
import { getToken } from "next-auth/jwt";
import { db } from "~/server/db";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
type CreateContextOptions = {
	headers: Headers;
	req?: Request;
};

export const createTRPCContext = async (opts: CreateContextOptions) => {
	const readCookie = (header: string | null, name: string) => {
		if (!header) return null;
		for (const part of header.split(";")) {
			const [key, ...rest] = part.trim().split("=");
			if (key === name) {
				return decodeURIComponent(rest.join("="));
			}
		}
		return null;
	};

	const cookieHeader = opts.headers.get("cookie");
	const e2eEmailHeader = opts.headers.get("x-e2e-user-email");
	const e2eEmailCookie = readCookie(cookieHeader, "e2e_user_email");
	const e2eEmail =
		(e2eEmailHeader ?? e2eEmailCookie)?.trim().toLowerCase() ?? null;

	if (process.env.NODE_ENV !== "production" && e2eEmail) {
		const user = await db.user.findUnique({
			where: { email: e2eEmail },
			select: { id: true, email: true, name: true, role: true },
		});
		if (user) {
			return {
				db,
				session: {
					user: {
						id: user.id,
						email: user.email ?? undefined,
						name: user.name ?? undefined,
						role: user.role,
					},
					expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
				},
				...opts,
			};
		}
	}

	let session = await auth();
	if (!session && opts.req) {
		session = await auth(opts.req);
	}
	if (!session && opts.req) {
		const token = await getToken({ req: opts.req, secret: env.NEXTAUTH_SECRET });
		if (token) {
			session = {
				user: {
					id: (token as any).id ?? token.sub ?? "",
					email: token.email ?? undefined,
					name: token.name ?? undefined,
					role: (token as any).role ?? "EMPLOYEE",
				},
				expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
			};
		}
	}
	if (!session && process.env.NODE_ENV !== "production") {
		if (e2eEmail) {
			const user = await db.user.findUnique({
				where: { email: e2eEmail },
				select: { id: true, email: true, name: true, role: true },
			});
			if (user) {
				session = {
					user: {
						id: user.id,
						email: user.email ?? undefined,
						name: user.name ?? undefined,
						role: user.role,
					},
					expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
				};
			}
		}
	}

	return {
		db,
		session,
		...opts,
	};
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure;

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session?.user) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next({
		ctx: {
			// infers the `session` as non-nullable
			session: { ...ctx.session, user: ctx.session.user },
		},
	});
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
	if (ctx.session.user.role !== "ADMIN") {
		throw new TRPCError({ code: "FORBIDDEN" });
	}
	return next();
});
