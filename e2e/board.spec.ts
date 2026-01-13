import { test, expect } from "@playwright/test";
import { login, waitForTrpcResponse } from "./utils";

const employeeEmail = process.env.E2E_EMPLOYEE_EMAIL;
const employeePassword = process.env.E2E_EMPLOYEE_PASSWORD;
const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

async function createCategory(page: any, title: string) {
  await page.waitForFunction(
    () => typeof (globalThis as any).__e2eCreateCategory === "function",
  );
  const columns = page.getByTestId("category-column");
  const initialColumnCount = await columns.count();
  const createCategoryResponsePromise = waitForTrpcResponse(page, "board.createCategory");
  await page.evaluate((categoryTitle: string) => {
    (globalThis as any).__e2eCreateCategory?.(categoryTitle);
  }, title);
  const createCategoryResponse = await createCategoryResponsePromise;
  expect(createCategoryResponse.ok()).toBeTruthy();

  await page.waitForFunction(
    (expected) =>
      document.querySelectorAll('[data-testid="category-column"]').length >= expected,
    initialColumnCount + 1,
  );
  const column = page.getByTestId("category-column").filter({ hasText: title }).first();
  await expect(column).toBeVisible({ timeout: 60_000 });
  await waitForCategory(column);
  return column;
}

async function createTaskInColumn(page: any, column: any, title: string) {
  const addTaskButton = column.getByTestId("add-task");
  await expect(addTaskButton).toBeVisible({ timeout: 20_000 });
  await addTaskButton.click();
  const taskInput = column.getByTestId("task-title-input");
  await expect(taskInput).toBeVisible({ timeout: 20_000 });
  await taskInput.fill(title);
  const taskSubmit = column.getByTestId("task-submit");
  await expect(taskSubmit).toBeEnabled({ timeout: 20_000 });
  const createTaskResponsePromise = waitForTrpcResponse(page, "board.createTask");
  await taskSubmit.click();
  const createTaskResponse = await createTaskResponsePromise;
  expect(createTaskResponse.ok()).toBeTruthy();
  return waitForTaskCard(column, title);
}

async function waitForCategory(column: any) {
  await expect(column).toHaveAttribute("data-category-id", /^(?!temp-).+/, { timeout: 60_000 });
}

async function waitForTaskCard(column: any, title: string) {
  const taskCard = column.locator(
    '[data-testid="task-item"][data-task-id]:not([data-task-id^="temp-"])',
    { hasText: title },
  ).first();
  await expect(taskCard).toBeVisible({ timeout: 60_000 });
  return taskCard;
}

async function extractTrpcJson(response: any) {
  const payload = await response.json();
  const first = Array.isArray(payload) ? payload[0] : payload;
  const result = first?.result ?? first;
  const data = result?.data ?? result;
  return data?.json ?? data;
}

async function dragToTarget(page: any, source: any, target: any) {
  const dragHandle = source.locator(".cursor-grab").first();
  await dragHandle.scrollIntoViewIfNeeded();
  const start = await dragHandle.boundingBox();
  const end = await target.boundingBox();
  if (!start || !end) throw new Error("Missing drag bounds");

  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 15 });
  await page.mouse.up();
}

test.describe("board", () => {
  test("employee can create category, task, and open export", async ({ page }) => {
    test.skip(!employeeEmail || !employeePassword, "Missing employee credentials");
    test.setTimeout(120_000);

    const unique = Date.now();
    const categoryTitle = `E2E kategorija ${unique}`;
    const taskTitle = `E2E uzduotis ${unique}`;

    await login(page, employeeEmail!, employeePassword!);

    const column = await createCategory(page, categoryTitle);
    await createTaskInColumn(page, column, taskTitle);

    const boardResponsePromise = waitForTrpcResponse(page, "board.getBoard");
    await page.reload({ waitUntil: "domcontentloaded" });
    const boardResponse = await boardResponsePromise;
    expect(boardResponse.ok()).toBeTruthy();

    const refreshedColumn = page
      .getByTestId("category-column")
      .filter({ hasText: categoryTitle })
      .first();
    const taskCard = await waitForTaskCard(refreshedColumn, taskTitle);
    await taskCard.scrollIntoViewIfNeeded();
    await taskCard.click({ timeout: 60_000, force: true });
    await expect(page.getByTestId("task-export")).toBeVisible();
  });

  test("employee can drag task between categories and persist order", async ({ page }) => {
    test.skip(!employeeEmail || !employeePassword, "Missing employee credentials");
    test.setTimeout(150_000);

    const unique = Date.now();
    const categoryA = `E2E stulpelis A ${unique}`;
    const categoryB = `E2E stulpelis B ${unique}`;
    const taskA = `E2E perkelti ${unique}`;
    const taskB = `E2E tikslas ${unique}`;

    await login(page, employeeEmail!, employeePassword!);

    const columnA = await createCategory(page, categoryA);
    const columnB = await createCategory(page, categoryB);

    await createTaskInColumn(page, columnA, taskA);
    await createTaskInColumn(page, columnB, taskB);

    const preDragBoardResponse = waitForTrpcResponse(page, "board.getBoard");
    await page.reload({ waitUntil: "domcontentloaded" });
    await preDragBoardResponse;

    const refreshedColumnA = page
      .getByTestId("category-column")
      .filter({ hasText: categoryA })
      .first();
    const refreshedColumnB = page
      .getByTestId("category-column")
      .filter({ hasText: categoryB })
      .first();

    await refreshedColumnA.scrollIntoViewIfNeeded();
    await refreshedColumnB.scrollIntoViewIfNeeded();

    const taskCard = await waitForTaskCard(refreshedColumnA, taskA);

    const updatePromise = waitForTrpcResponse(page, "board.updateTaskPosition");
    await dragToTarget(page, taskCard, refreshedColumnB);

    const updateResponse = await updatePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(refreshedColumnB.getByText(taskA).first()).toBeVisible({ timeout: 60_000 });

    const boardResponsePromise = waitForTrpcResponse(page, "board.getBoard");
    await page.reload({ waitUntil: "domcontentloaded" });
    const boardResponse = await boardResponsePromise;
    expect(boardResponse.ok()).toBeTruthy();

    const refreshedColumn = page
      .getByTestId("category-column")
      .filter({ hasText: categoryB })
      .first();
    const tasks = refreshedColumn.getByTestId("task-item");
    await expect(tasks.nth(0)).toContainText(taskA, { timeout: 60_000 });
    await expect(tasks.nth(1)).toContainText(taskB, { timeout: 60_000 });
  });

  test("employee can reorder tasks within category and persist order", async ({ page }) => {
    test.skip(!employeeEmail || !employeePassword, "Missing employee credentials");
    test.setTimeout(180_000);

    const unique = Date.now();
    const categoryTitle = `E2E reorder ${unique}`;
    const taskTop = `E2E top ${unique}`;
    const taskBottom = `E2E bottom ${unique}`;

    await login(page, employeeEmail!, employeePassword!);

    const column = await createCategory(page, categoryTitle);
    await createTaskInColumn(page, column, taskTop);
    await createTaskInColumn(page, column, taskBottom);

    const preDragBoardResponse = waitForTrpcResponse(page, "board.getBoard");
    await page.reload({ waitUntil: "domcontentloaded" });
    await preDragBoardResponse;

    const refreshedColumn = page
      .getByTestId("category-column")
      .filter({ hasText: categoryTitle })
      .first();
    await refreshedColumn.scrollIntoViewIfNeeded();
    const taskTopCard = await waitForTaskCard(refreshedColumn, taskTop);
    const taskBottomCard = await waitForTaskCard(refreshedColumn, taskBottom);

    const moveDownPromise = waitForTrpcResponse(page, "board.updateTaskPosition");
    await dragToTarget(page, taskTopCard, taskBottomCard);
    const moveDownResponse = await moveDownPromise;
    expect(moveDownResponse.ok()).toBeTruthy();

    const boardResponsePromise = waitForTrpcResponse(page, "board.getBoard");
    await page.reload({ waitUntil: "domcontentloaded" });
    const boardResponse = await boardResponsePromise;
    expect(boardResponse.ok()).toBeTruthy();

    const refreshedColumnAfter = page
      .getByTestId("category-column")
      .filter({ hasText: categoryTitle })
      .first();
    await refreshedColumnAfter.scrollIntoViewIfNeeded();
    const tasksAfter = refreshedColumnAfter.getByTestId("task-item");
    await expect(tasksAfter.nth(0)).toContainText(taskBottom, { timeout: 60_000 });
    await expect(tasksAfter.nth(1)).toContainText(taskTop, { timeout: 60_000 });

    const taskTopCardAfter = await waitForTaskCard(refreshedColumnAfter, taskTop);
    const taskBottomCardAfter = await waitForTaskCard(refreshedColumnAfter, taskBottom);

    const moveUpPromise = waitForTrpcResponse(page, "board.updateTaskPosition");
    await dragToTarget(page, taskTopCardAfter, taskBottomCardAfter);
    const moveUpResponse = await moveUpPromise;
    expect(moveUpResponse.ok()).toBeTruthy();

    const boardResponsePromise2 = waitForTrpcResponse(page, "board.getBoard");
    await page.reload({ waitUntil: "domcontentloaded" });
    const boardResponse2 = await boardResponsePromise2;
    expect(boardResponse2.ok()).toBeTruthy();

    const refreshedColumnFinal = page
      .getByTestId("category-column")
      .filter({ hasText: categoryTitle })
      .first();
    await refreshedColumnFinal.scrollIntoViewIfNeeded();
    const tasksFinal = refreshedColumnFinal.getByTestId("task-item");
    await expect(tasksFinal.nth(0)).toContainText(taskTop, { timeout: 60_000 });
    await expect(tasksFinal.nth(1)).toContainText(taskBottom, { timeout: 60_000 });
  });

  test("employee can drag task to empty category and persist order", async ({ page }) => {
    test.skip(!employeeEmail || !employeePassword, "Missing employee credentials");
    test.setTimeout(150_000);

    const unique = Date.now();
    const categoryA = `E2E source ${unique}`;
    const categoryB = `E2E empty ${unique}`;
    const taskTitle = `E2E move ${unique}`;

    await login(page, employeeEmail!, employeePassword!);

    const columnA = await createCategory(page, categoryA);
    await createCategory(page, categoryB);
    await createTaskInColumn(page, columnA, taskTitle);

    const preDragBoardResponse = waitForTrpcResponse(page, "board.getBoard");
    await page.reload({ waitUntil: "domcontentloaded" });
    await preDragBoardResponse;

    const refreshedColumnA = page
      .getByTestId("category-column")
      .filter({ hasText: categoryA })
      .first();
    const refreshedColumnB = page
      .getByTestId("category-column")
      .filter({ hasText: categoryB })
      .first();
    await refreshedColumnA.scrollIntoViewIfNeeded();
    await refreshedColumnB.scrollIntoViewIfNeeded();

    const taskCard = await waitForTaskCard(refreshedColumnA, taskTitle);

    const updatePromise = waitForTrpcResponse(page, "board.updateTaskPosition");
    await dragToTarget(page, taskCard, refreshedColumnB);
    const updateResponse = await updatePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(refreshedColumnB.getByText(taskTitle).first()).toBeVisible({ timeout: 60_000 });

    const boardResponsePromise = waitForTrpcResponse(page, "board.getBoard");
    await page.reload({ waitUntil: "domcontentloaded" });
    const boardResponse = await boardResponsePromise;
    expect(boardResponse.ok()).toBeTruthy();

    const refreshedColumnAfterA = page
      .getByTestId("category-column")
      .filter({ hasText: categoryA })
      .first();
    const refreshedColumnAfterB = page
      .getByTestId("category-column")
      .filter({ hasText: categoryB })
      .first();
    await refreshedColumnAfterA.scrollIntoViewIfNeeded();
    await refreshedColumnAfterB.scrollIntoViewIfNeeded();
    await expect(refreshedColumnAfterA.getByTestId("task-item")).toHaveCount(0);
    const tasks = refreshedColumnAfterB.getByTestId("task-item");
    await expect(tasks.nth(0)).toContainText(taskTitle, { timeout: 60_000 });
  });

  test("employee can delete category with tasks and reorder categories", async ({ page }) => {
    test.skip(!employeeEmail || !employeePassword, "Missing employee credentials");
    test.setTimeout(180_000);

    const unique = Date.now();
    const categoryA = `E2E delete A ${unique}`;
    const categoryB = `E2E delete B ${unique}`;
    const taskA = `E2E delete task A ${unique}`;
    const taskB = `E2E delete task B ${unique}`;

    await login(page, employeeEmail!, employeePassword!);

    const columnA = await createCategory(page, categoryA);
    await createTaskInColumn(page, columnA, taskA);
    const columnB = await createCategory(page, categoryB);
    await createTaskInColumn(page, columnB, taskB);

    const preDeleteBoardResponse = waitForTrpcResponse(page, "board.getBoard");
    await page.reload({ waitUntil: "domcontentloaded" });
    const preDeleteResponse = await preDeleteBoardResponse;
    expect(preDeleteResponse.ok()).toBeTruthy();

    const preDeleteData = await extractTrpcJson(preDeleteResponse);
    if (!Array.isArray(preDeleteData)) {
      throw new Error("Unexpected board response");
    }
    const preCategoryA = preDeleteData.find((cat: any) => cat.title === categoryA);
    const preCategoryB = preDeleteData.find((cat: any) => cat.title === categoryB);
    if (!preCategoryA || !preCategoryB) {
      throw new Error("Missing categories in board data");
    }

    const refreshedColumnA = page
      .getByTestId("category-column")
      .filter({ hasText: categoryA })
      .first();
    await refreshedColumnA.scrollIntoViewIfNeeded();

    page.once("dialog", (dialog) => dialog.accept());
    const deletePromise = waitForTrpcResponse(page, "board.deleteCategory");
    await refreshedColumnA.getByTestId("delete-category").click();
    const deleteResponse = await deletePromise;
    expect(deleteResponse.ok()).toBeTruthy();

    const postDeleteBoardResponse = waitForTrpcResponse(page, "board.getBoard");
    await page.reload({ waitUntil: "domcontentloaded" });
    const postDeleteResponse = await postDeleteBoardResponse;
    expect(postDeleteResponse.ok()).toBeTruthy();

    const postDeleteData = await extractTrpcJson(postDeleteResponse);
    if (!Array.isArray(postDeleteData)) {
      throw new Error("Unexpected board response");
    }
    const postCategoryA = postDeleteData.find((cat: any) => cat.title === categoryA);
    const postCategoryB = postDeleteData.find((cat: any) => cat.title === categoryB);
    expect(postCategoryA).toBeFalsy();
    expect(postCategoryB).toBeTruthy();
    expect(postCategoryB.order).toBe(preCategoryB.order - 1);

    const hasTaskA = postDeleteData.some((cat: any) =>
      (cat.tasks ?? []).some((task: any) => task.title === taskA),
    );
    expect(hasTaskA).toBeFalsy();
    const hasTaskB = postDeleteData.some((cat: any) =>
      (cat.tasks ?? []).some((task: any) => task.title === taskB),
    );
    expect(hasTaskB).toBeTruthy();
  });

  test("employee cannot create empty category or task", async ({ page }) => {
    test.skip(!employeeEmail || !employeePassword, "Missing employee credentials");
    test.setTimeout(120_000);

    const unique = Date.now();
    const categoryTitle = `E2E empty checks ${unique}`;

    await login(page, employeeEmail!, employeePassword!);

    const preCheckBoardResponse = waitForTrpcResponse(page, "board.getBoard");
    await page.reload({ waitUntil: "domcontentloaded" });
    await preCheckBoardResponse;

    await page.waitForFunction(
      () => typeof (globalThis as any).__e2eCreateCategory === "function",
    );
    const columns = page.getByTestId("category-column");
    const initialColumnCount = await columns.count();
    await page.evaluate(() => {
      (globalThis as any).__e2eCreateCategory?.("   ");
    });
    await page.waitForTimeout(500);
    await expect(columns).toHaveCount(initialColumnCount);

    const column = await createCategory(page, categoryTitle);
    await column.getByTestId("add-task").click();
    const taskInput = column.getByTestId("task-title-input");
    await taskInput.fill("   ");
    const taskSubmit = column.getByTestId("task-submit");
    await expect(taskSubmit).toBeDisabled();
    await page.waitForTimeout(500);
    await expect(column.getByTestId("task-item")).toHaveCount(0);
  });

  test("employee can edit task, add comment, and toggle completion", async ({ page }) => {
    test.skip(!employeeEmail || !employeePassword, "Missing employee credentials");
    test.setTimeout(150_000);

    const unique = Date.now();
    const categoryTitle = `E2E edit ${unique}`;
    const taskTitle = `E2E task ${unique}`;
    const updatedTitle = `E2E updated ${unique}`;
    const commentText = `E2E komentaras ${unique}`;

    await login(page, employeeEmail!, employeePassword!);

    const column = await createCategory(page, categoryTitle);
    const taskCard = await createTaskInColumn(page, column, taskTitle);

    const preEditBoardResponse = waitForTrpcResponse(page, "board.getBoard");
    await page.reload({ waitUntil: "domcontentloaded" });
    await preEditBoardResponse;
    const refreshedColumn = page
      .getByTestId("category-column")
      .filter({ hasText: categoryTitle })
      .first();
    const refreshedTaskCard = await waitForTaskCard(refreshedColumn, taskTitle);
    await refreshedTaskCard.click({ timeout: 60_000, force: true });

    await page.getByTitle(/Redaguoti/i).click();
    const titleInput = page.locator(`input[value="${taskTitle}"]`);
    await expect(titleInput).toBeVisible({ timeout: 20_000 });
    await titleInput.fill(updatedTitle);
    const description = page.locator("textarea");
    await description.fill("Updated description");

    const updatePromise = waitForTrpcResponse(page, "board.updateTaskDetails");
    await page.getByTitle(/saugoti/i).click();
    const updateResponse = await updatePromise;
    if (!updateResponse.ok()) {
      throw new Error(
        `board.updateTaskDetails failed: ${updateResponse.status()} ${await updateResponse.text()}`,
      );
    }

    await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 60_000 });

    const togglePromise = waitForTrpcResponse(page, "board.toggleTaskCompletion");
    await page.getByRole("combobox").selectOption("done");
    const toggleResponse = await togglePromise;
    expect(toggleResponse.ok()).toBeTruthy();
    await expect(page.getByRole("combobox")).toHaveValue("done");

    const commentInput = page.getByPlaceholder(/komentar/i);
    await commentInput.fill(commentText);
    const commentPromise = waitForTrpcResponse(page, "board.addCommentToTask");
    await page.getByRole("button", { name: /Si.sti/i }).click();
    const commentResponse = await commentPromise;
    expect(commentResponse.ok()).toBeTruthy();
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 60_000 });
  });

  test("employee can upload and delete photo", async ({ page }) => {
    test.skip(!employeeEmail || !employeePassword, "Missing employee credentials");
    test.skip(!hasBlobToken, "Missing BLOB_READ_WRITE_TOKEN for uploads");
    test.setTimeout(180_000);

    const unique = Date.now();
    const categoryTitle = `E2E foto ${unique}`;
    const taskTitle = `E2E foto task ${unique}`;

    await login(page, employeeEmail!, employeePassword!);

    const column = await createCategory(page, categoryTitle);
    const taskCard = await createTaskInColumn(page, column, taskTitle);

    await taskCard.click({ timeout: 60_000, force: true });

    const addPhotoPromise = waitForTrpcResponse(page, "board.addPhotoToTask");
    const input = page.getByTestId("task-photo-input");
    await input.setInputFiles({
      name: "photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });
    const addPhotoResponse = await addPhotoPromise;
    expect(addPhotoResponse.ok()).toBeTruthy();

    const photo = page.getByAltText(/nuotrauka/i).first();
    await expect(photo).toBeVisible({ timeout: 60_000 });

    page.once("dialog", (dialog) => dialog.accept());
    const deletePromise = waitForTrpcResponse(page, "board.deletePhotoFromTask");
    await photo.hover();
    await page.getByTitle(/trinti/i).click({ force: true });
    const deleteResponse = await deletePromise;
    expect(deleteResponse.ok()).toBeTruthy();

    await expect(page.getByAltText(/nuotrauka/i)).toHaveCount(0);
  });
});
