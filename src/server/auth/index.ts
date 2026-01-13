// src/server/auth/index.ts
import { cookies, headers } from "next/headers";
import NextAuth from "next-auth";
import { db } from "~/server/db";
import { authConfig } from "./config"; // PATAISYTA: Dabar importuojama teisinga konstanta

const { handlers, auth: nextAuthAuth, signIn, signOut } = NextAuth(authConfig as any);

const readCookieValue = (cookieHeader: string | null, name: string) => {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
};

const getE2ESession = async (req?: Request) => {
  if (process.env.NODE_ENV === "production" || process.env.E2E_BYPASS_AUTH !== "true") {
    return null;
  }

  const headerSource = req?.headers ?? headers();
  const cookieHeader = req?.headers.get("cookie") ?? null;

  const headerEmail = headerSource.get("x-e2e-user-email");
  const headerRole = headerSource.get("x-e2e-user-role");
  const cookieEmail = cookieHeader
    ? readCookieValue(cookieHeader, "e2e_user_email")
    : cookies().get("e2e_user_email")?.value ?? null;
  const cookieRole = cookieHeader
    ? readCookieValue(cookieHeader, "e2e_user_role")
    : cookies().get("e2e_user_role")?.value ?? null;

  const email = (headerEmail ?? cookieEmail)?.trim().toLowerCase();
  if (!email) return null;

  const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim().toLowerCase();
  const employeeEmail = process.env.E2E_EMPLOYEE_EMAIL?.trim().toLowerCase();

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });

  const fallbackRole =
    headerRole ??
    cookieRole ??
    (adminEmail && email === adminEmail
      ? "ADMIN"
      : employeeEmail && email === employeeEmail
        ? "EMPLOYEE"
        : "EMPLOYEE");
  const role = (user?.role ?? fallbackRole) as typeof user.role;

  return {
    user: {
      id: user?.id ?? `e2e-${email}`,
      email: user?.email ?? email,
      name: user?.name ?? "E2E User",
      role,
    },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
};

const resolveRequest = (args: unknown[]) => {
  const first = args[0];
  if (first instanceof Request) return first;
  if (first && typeof first === "object" && "req" in (first as any)) {
    const maybeReq = (first as any).req;
    if (maybeReq instanceof Request) return maybeReq;
  }
  return undefined;
};

const auth = async (...args: unknown[]) => {
  const req = resolveRequest(args);
  const e2eSession = await getE2ESession(req);
  if (e2eSession) return e2eSession;
  return (nextAuthAuth as any)(...args);
};

export { auth, handlers, signIn, signOut };
