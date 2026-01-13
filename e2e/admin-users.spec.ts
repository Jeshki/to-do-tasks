import { test, expect } from "@playwright/test";
import { login, waitForTrpcResponse } from "./utils";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe("admin users", () => {
  test("admin can create a new employee", async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, "Missing admin credentials");
    test.setTimeout(120_000);

    const unique = Date.now();
    const email = `e2e-user-${unique}@test.local`;
    const password = `Password${unique}!`;

    await login(page, adminEmail!, adminPassword!);
    const initialListUsersPromise = waitForTrpcResponse(page, "admin.listUsers");
    await page.goto("/admin", { waitUntil: "domcontentloaded", timeout: 60_000 });
    const initialListUsersResponse = await initialListUsersPromise;
    expect(initialListUsersResponse.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/admin/);
    const emailInput = page.getByTestId("admin-create-email");
    const firstNameInput = page.getByTestId("admin-create-first-name");
    const lastNameInput = page.getByTestId("admin-create-last-name");
    const passwordInput = page.getByTestId("admin-create-password");
    await expect(emailInput).toBeVisible({ timeout: 30_000 });
    await expect(emailInput).toBeEditable({ timeout: 30_000 });
    await expect(firstNameInput).toBeEditable({ timeout: 30_000 });
    await expect(lastNameInput).toBeEditable({ timeout: 30_000 });
    await expect(passwordInput).toBeEditable({ timeout: 30_000 });
    await firstNameInput.click();
    await firstNameInput.fill("Test");
    await expect(firstNameInput).toHaveValue("Test", { timeout: 30_000 });
    await lastNameInput.click();
    await lastNameInput.fill("Worker");
    await expect(lastNameInput).toHaveValue("Worker", { timeout: 30_000 });
    await passwordInput.click();
    await passwordInput.fill(password);
    await expect(passwordInput).toHaveValue(password, { timeout: 30_000 });
    await emailInput.click();
    await emailInput.fill(email);
    await expect(emailInput).toHaveValue(email, { timeout: 30_000 });
    const submitButton = page.getByTestId("admin-create-submit");
    await expect(submitButton).toBeEnabled({ timeout: 30_000 });
    const createUserResponsePromise = waitForTrpcResponse(page, "admin.createUser");
    await submitButton.click();
    const createUserResponse = await createUserResponsePromise;
    expect(createUserResponse.ok()).toBeTruthy();
    await expect(submitButton).toBeEnabled({ timeout: 60_000 });
    await expect(page.getByTestId("admin-create-email")).toHaveValue("", { timeout: 60_000 });
    await expect(page.getByTestId("admin-create-submit")).toBeEnabled({ timeout: 60_000 });
    const listUsersResponsePromise = waitForTrpcResponse(page, "admin.listUsers");
    await page.reload({ waitUntil: "domcontentloaded" });
    const listUsersResponse = await listUsersResponsePromise;
    expect(listUsersResponse.ok()).toBeTruthy();

    await expect(page.getByText(email)).toBeVisible({ timeout: 60_000 });
  });
});
