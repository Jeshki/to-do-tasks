import { test, expect } from "@playwright/test";
import { login } from "./utils";

const employeeEmail = process.env.E2E_EMPLOYEE_EMAIL;
const employeePassword = process.env.E2E_EMPLOYEE_PASSWORD;

test.describe("access control", () => {
  test("employee is redirected from admin page", async ({ page }) => {
    test.skip(!employeeEmail || !employeePassword, "Missing employee credentials");

    await login(page, employeeEmail!, employeePassword!);
    await page.goto("/admin", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("home-title")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("signout-button")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("admin-link")).toHaveCount(0, { timeout: 30_000 });
    expect(page.url()).not.toContain("/admin");
  });
});
