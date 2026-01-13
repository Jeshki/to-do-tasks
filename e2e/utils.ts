import { expect, type Page } from "@playwright/test";

export async function login(page: Page, email: string, password: string) {
  const adminEmail = process.env.E2E_ADMIN_EMAIL?.toLowerCase().trim();
  const employeeEmail = process.env.E2E_EMPLOYEE_EMAIL?.toLowerCase().trim();
  const normalizedEmail = email.toLowerCase().trim();
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  const bypassAuth = process.env.E2E_BYPASS_AUTH === "true";
  const role =
    adminEmail && normalizedEmail === adminEmail
      ? "ADMIN"
      : employeeEmail && normalizedEmail === employeeEmail
        ? "EMPLOYEE"
        : undefined;

  await page.context().setExtraHTTPHeaders({
    "x-e2e-user-email": normalizedEmail,
    ...(role ? { "x-e2e-user-role": role } : {}),
  });

  await page.context().addCookies([
    {
      name: "e2e_user_email",
      value: normalizedEmail,
      url: baseUrl,
    },
    ...(role
      ? [
          {
            name: "e2e_user_role",
            value: role,
            url: baseUrl,
          },
        ]
      : []),
  ]);

  await page.addInitScript(
    ({ email: initEmail, role: initRole }) => {
      (window as any).__e2eUser = { email: initEmail, role: initRole };
    },
    { email: normalizedEmail, role },
  );

  if (bypassAuth) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("signout-button")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("home-title")).toBeVisible({ timeout: 60_000 });
    return;
  }

  await page.goto("/signin", { waitUntil: "domcontentloaded" });
  const emailInput = page.getByTestId("signin-email");
  const passwordInput = page.getByTestId("signin-password");
  await expect(emailInput).toBeVisible({ timeout: 30_000 });
  await expect(passwordInput).toBeVisible({ timeout: 30_000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);

  await page.getByTestId("signin-submit").click();

  await expect(page.getByTestId("signout-button")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("home-title")).toBeVisible({ timeout: 60_000 });
}

export async function waitForHydration(page: Page) {
  await page.waitForFunction(() => (globalThis as any).__e2eHydrated === true);
}

export async function waitForTrpcResponse(page: Page, procedureName: string) {
  return page.waitForResponse((response) => {
    const url = response.url();
    if (!url.includes("/api/trpc")) return false;
    if (url.includes(`/api/trpc/${procedureName}`)) return true;
    const postData = response.request().postData();
    return Boolean(postData && postData.includes(procedureName));
  });
}
