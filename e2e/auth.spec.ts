import { test, expect } from "@playwright/test";
import { login } from "./utils";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const employeeEmail = process.env.E2E_EMPLOYEE_EMAIL;
const employeePassword = process.env.E2E_EMPLOYEE_PASSWORD;
const bypassAuth = process.env.E2E_BYPASS_AUTH === "true";

test.describe("auth", () => {
  test("admin sees administravimas button", async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, "Missing admin credentials");

    await login(page, adminEmail!, adminPassword!);
    await expect(page.getByTestId("admin-link")).toBeVisible();
  });

  test("employee does not see administravimas button", async ({ page }) => {
    test.skip(!employeeEmail || !employeePassword, "Missing employee credentials");

    await login(page, employeeEmail!, employeePassword!);
    await expect(page.getByTestId("admin-link")).toHaveCount(0, { timeout: 30_000 });
  });

  test("invalid login shows error", async ({ page }) => {
    if (bypassAuth) {
      await page.goto("/signin?error=CredentialsSignin", { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/Neteisingas|Prieiga/i)).toBeVisible({ timeout: 30_000 });
      return;
    }

    await page.goto("/signin", { waitUntil: "domcontentloaded" });
    const unique = Date.now();
    await page.getByTestId("signin-email").fill(`invalid-${unique}@test.local`);
    await page.getByTestId("signin-password").fill("wrongpass");
    await page.getByTestId("signin-submit").click();
    await expect(page.getByText(/Neteisingas|Prieiga/i)).toBeVisible({ timeout: 30_000 });
  });

  test("signout redirects to signin", async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, "Missing admin credentials");
    test.skip(bypassAuth, "E2E_BYPASS_AUTH keeps sessions via e2e cookies");

    await login(page, adminEmail!, adminPassword!);
    await page.getByTestId("signout-button").click();
    await expect(page.getByTestId("signin-email")).toBeVisible({ timeout: 60_000 });
    await expect(page).toHaveURL(/\/signin/);
  });
});
