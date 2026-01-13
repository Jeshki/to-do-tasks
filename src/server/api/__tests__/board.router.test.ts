import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("~/server/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "user1" } })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

import { appRouter } from "../root";

const mockDb = {
  category: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    updateMany: vi.fn(),
  },
  task: {
    findFirst: vi.fn(),
    findFirstOrThrow: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  comment: {
    create: vi.fn(),
  },
  photo: {
    findFirst: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
  },
  $transaction: async (fn: any) => fn(mockDb),
};

const baseCtx = {
  db: mockDb as any,
  session: {
    user: { id: "user1", email: "u@a.lt", name: "U" },
    expires: new Date().toISOString(),
  },
  headers: new Headers(),
};

describe("boardRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getBoard filters by user and orders", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.category.findMany.mockResolvedValueOnce([{ id: "c1" }]);

    const res = await caller.board.getBoard();
    expect(res).toEqual([{ id: "c1" }]);
    expect(mockDb.category.findMany).toHaveBeenCalledWith({
      where: { userId: "user1" },
      include: {
        tasks: {
          include: {
            photos: true,
            comments: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });
  });

  it("createCategory sets userId and order", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.category.findFirst.mockResolvedValueOnce({ order: 1 });
    mockDb.category.create.mockResolvedValueOnce({ id: "c1", title: "Test", order: 2 });

    const res = await caller.board.createCategory({ title: "Test" });
    expect(res).toEqual({ id: "c1", title: "Test", order: 2 });
    expect(mockDb.category.create).toHaveBeenCalledWith({
      data: { title: "Test", userId: "user1", order: 2, color: "#94a3b8" },
    });
  });

  it("createTask sets order and category", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.category.findFirst.mockResolvedValueOnce({ id: "cat1", userId: "user1" });
    mockDb.task.findFirst.mockResolvedValueOnce({ order: 5 });
    mockDb.task.create.mockResolvedValueOnce({ id: "t1" });

    const res = await caller.board.createTask({ title: "Hello", categoryId: "cat1" });
    expect(res).toEqual({ id: "t1" });
    expect(mockDb.task.create).toHaveBeenCalledWith({
      data: { title: "Hello", categoryId: "cat1", order: 6, completed: false },
    });
  });

  it("createTask throws when category missing", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.category.findFirst.mockResolvedValueOnce(null);

    await expect(
      caller.board.createTask({ title: "Hello", categoryId: "missing" }),
    ).rejects.toThrow("Kategorija nerasta");
  });

  it("addCommentToTask creates a comment", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirstOrThrow.mockResolvedValueOnce({ id: "t1" });
    mockDb.comment.create.mockResolvedValueOnce({ id: "cmt1", text: "Labas" });

    const res = await caller.board.addCommentToTask({ taskId: "t1", text: "Labas" });
    expect(res).toEqual({ id: "cmt1", text: "Labas" });
    expect(mockDb.comment.create).toHaveBeenCalledWith({
      data: { text: "Labas", taskId: "t1" },
    });
  });

  it("deleteCategory deletes and reorders", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.category.findFirst.mockResolvedValueOnce({ id: "cDel", userId: "user1", order: 2 });
    mockDb.category.delete.mockResolvedValueOnce({});
    mockDb.category.updateMany.mockResolvedValueOnce({});

    const res = await caller.board.deleteCategory({ categoryId: "cDel" });
    expect(res).toEqual({ success: true });
    expect(mockDb.category.delete).toHaveBeenCalledWith({ where: { id: "cDel" } });
    expect(mockDb.category.updateMany).toHaveBeenCalledWith({
      where: { userId: "user1", order: { gt: 2 } },
      data: { order: { decrement: 1 } },
    });
  });

  it("deleteCategory throws when category missing", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.category.findFirst.mockResolvedValueOnce(null);

    await expect(caller.board.deleteCategory({ categoryId: "missing" })).rejects.toThrow(
      "Kategorija nerasta",
    );
  });

  it("deleteTask deletes and reorders", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirst.mockResolvedValueOnce({
      id: "tDel",
      categoryId: "cat1",
      order: 3,
      category: { userId: "user1" },
    });
    mockDb.task.delete.mockResolvedValueOnce({});
    mockDb.task.updateMany.mockResolvedValueOnce({});

    const res = await caller.board.deleteTask({ id: "tDel" });
    expect(res).toEqual({ success: true });
    expect(mockDb.task.delete).toHaveBeenCalledWith({ where: { id: "tDel" } });
    expect(mockDb.task.updateMany).toHaveBeenCalledWith({
      where: { categoryId: "cat1", order: { gt: 3 } },
      data: { order: { decrement: 1 } },
    });
  });

  it("addPhotoToTask creates a photo", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirst.mockResolvedValueOnce({ id: "t1", category: { userId: "user1" } });
    mockDb.photo.create.mockResolvedValueOnce({ id: "p1", url: "u" });

    const res = await caller.board.addPhotoToTask({ taskId: "t1", url: "http://x" });
    expect(res).toEqual({ id: "p1", url: "u" });
    expect(mockDb.photo.create).toHaveBeenCalledWith({
      data: { url: "http://x", taskId: "t1" },
    });
  });

  it("addPhotoToTask throws when task missing", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirst.mockResolvedValueOnce(null);
    mockDb.task.findUnique.mockResolvedValueOnce(null);

    await expect(
      caller.board.addPhotoToTask({ taskId: "t1", url: "http://x" }),
    ).rejects.toThrow("Task not found or you do not have permission.");
  });

  it("deletePhotoFromTask removes photo", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.photo.findFirst.mockResolvedValueOnce({
      id: "p1",
      task: { category: { userId: "user1" } },
    });
    mockDb.photo.delete.mockResolvedValueOnce({ id: "p1" });

    const res = await caller.board.deletePhotoFromTask({ photoId: "p1" });
    expect(res).toEqual({ id: "p1" });
    expect(mockDb.photo.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("updateTaskPosition across categories", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirst.mockResolvedValueOnce({
      categoryId: "oldCat",
      order: 1,
    });
    mockDb.category.findFirst.mockResolvedValueOnce({ id: "newCat", userId: "user1" });

    mockDb.task.updateMany.mockResolvedValue({});
    mockDb.task.update.mockResolvedValueOnce({});

    const res = await caller.board.updateTaskPosition({
      taskId: "t1",
      newCategoryId: "newCat",
      newOrder: 0,
    });

    expect(res).toEqual({ success: true });
    expect(mockDb.task.updateMany).toHaveBeenNthCalledWith(1, {
      where: { categoryId: "oldCat", order: { gt: 1 } },
      data: { order: { decrement: 1 } },
    });
    expect(mockDb.task.updateMany).toHaveBeenNthCalledWith(2, {
      where: { categoryId: "newCat", order: { gte: 0 } },
      data: { order: { increment: 1 } },
    });
    expect(mockDb.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { categoryId: "newCat", order: 0 },
    });
  });

  it("updateTaskPosition throws when target category missing", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirst.mockResolvedValueOnce({
      categoryId: "oldCat",
      order: 1,
    });
    mockDb.category.findFirst.mockResolvedValueOnce(null);

    await expect(
      caller.board.updateTaskPosition({ taskId: "t1", newCategoryId: "missing", newOrder: 0 }),
    ).rejects.toThrow("Kategorija nerasta");
  });

  it("updateTaskPosition in same category", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirst.mockResolvedValueOnce({
      categoryId: "cat1",
      order: 5,
    });
    mockDb.category.findFirst.mockResolvedValueOnce({ id: "cat1", userId: "user1" });
    mockDb.task.updateMany.mockResolvedValue({});
    mockDb.task.update.mockResolvedValueOnce({});

    const res = await caller.board.updateTaskPosition({
      taskId: "t1",
      newCategoryId: "cat1",
      newOrder: 2,
    });

    expect(res).toEqual({ success: true });
    expect(mockDb.task.updateMany).toHaveBeenCalledWith({
      where: {
        categoryId: "cat1",
        order: { gte: 2, lt: 5 },
      },
      data: { order: { increment: 1 } },
    });
    expect(mockDb.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { order: 2 },
    });
  });

  it("updateTaskPosition in same category moves down", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirst.mockResolvedValueOnce({
      categoryId: "cat1",
      order: 1,
    });
    mockDb.category.findFirst.mockResolvedValueOnce({ id: "cat1", userId: "user1" });
    mockDb.task.updateMany.mockResolvedValue({});
    mockDb.task.update.mockResolvedValueOnce({});

    const res = await caller.board.updateTaskPosition({
      taskId: "t1",
      newCategoryId: "cat1",
      newOrder: 4,
    });

    expect(res).toEqual({ success: true });
    expect(mockDb.task.updateMany).toHaveBeenCalledWith({
      where: {
        categoryId: "cat1",
        order: { gt: 1, lte: 4 },
      },
      data: { order: { decrement: 1 } },
    });
    expect(mockDb.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { order: 4 },
    });
  });

  it("updateTaskPosition keeps orders contiguous and unique", async () => {
    const buildDb = (categories: any[], tasks: any[]) => {
      const matchesOrder = (value: number, condition?: any) => {
        if (!condition) return true;
        if (typeof condition === "number") return value === condition;
        if (condition.gt !== undefined && !(value > condition.gt)) return false;
        if (condition.gte !== undefined && !(value >= condition.gte)) return false;
        if (condition.lt !== undefined && !(value < condition.lt)) return false;
        if (condition.lte !== undefined && !(value <= condition.lte)) return false;
        return true;
      };

      const db = {
        category: {
          findFirst: async ({ where }: any) =>
            categories.find((cat) => cat.id === where.id && cat.userId === where.userId) ?? null,
        },
        task: {
          findFirst: async ({ where, select }: any) => {
            const task = tasks.find((item) => item.id === where.id);
            if (!task) return null;
            const category = categories.find((cat) => cat.id === task.categoryId);
            if (!category || category.userId !== baseCtx.session.user.id) return null;
            if (!select) return task;
            return {
              ...(select.categoryId ? { categoryId: task.categoryId } : {}),
              ...(select.order ? { order: task.order } : {}),
            };
          },
          updateMany: async ({ where, data }: any) => {
            let count = 0;
            for (const task of tasks) {
              if (task.categoryId !== where.categoryId) continue;
              if (!matchesOrder(task.order, where.order)) continue;
              if (data.order?.increment) task.order += data.order.increment;
              if (data.order?.decrement) task.order -= data.order.decrement;
              count += 1;
            }
            return { count };
          },
          update: async ({ where, data }: any) => {
            const task = tasks.find((item) => item.id === where.id);
            if (!task) throw new Error("Task not found");
            Object.assign(task, data);
            return task;
          },
        },
        $transaction: async (fn: any) => fn(db),
      };

      return { db, tasks };
    };

    const assertContiguousOrders = (tasks: any[], categoryId: string) => {
      const orders = tasks
        .filter((task) => task.categoryId === categoryId)
        .map((task) => task.order)
        .sort((a, b) => a - b);
      expect(new Set(orders).size).toBe(orders.length);
      expect(orders).toEqual(orders.map((_value, index) => index));
    };

    const categories = [
      { id: "catA", userId: "user1" },
      { id: "catB", userId: "user1" },
    ];

    {
      const tasks = [
        { id: "t1", categoryId: "catA", order: 0 },
        { id: "t2", categoryId: "catA", order: 1 },
        { id: "t3", categoryId: "catA", order: 2 },
        { id: "t4", categoryId: "catB", order: 0 },
      ];
      const { db } = buildDb(categories, tasks);
      const caller = appRouter.createCaller({ ...baseCtx, db });

      const res = await caller.board.updateTaskPosition({
        taskId: "t1",
        newCategoryId: "catA",
        newOrder: 2,
      });

      expect(res).toEqual({ success: true });
      assertContiguousOrders(tasks, "catA");
      assertContiguousOrders(tasks, "catB");
    }

    {
      const tasks = [
        { id: "t1", categoryId: "catA", order: 0 },
        { id: "t2", categoryId: "catA", order: 1 },
        { id: "t3", categoryId: "catA", order: 2 },
        { id: "t4", categoryId: "catB", order: 0 },
      ];
      const { db } = buildDb(categories, tasks);
      const caller = appRouter.createCaller({ ...baseCtx, db });

      const res = await caller.board.updateTaskPosition({
        taskId: "t3",
        newCategoryId: "catA",
        newOrder: 0,
      });

      expect(res).toEqual({ success: true });
      assertContiguousOrders(tasks, "catA");
      assertContiguousOrders(tasks, "catB");
    }

    {
      const tasks = [
        { id: "t1", categoryId: "catA", order: 0 },
        { id: "t2", categoryId: "catA", order: 1 },
        { id: "t3", categoryId: "catA", order: 2 },
        { id: "t4", categoryId: "catB", order: 0 },
        { id: "t5", categoryId: "catB", order: 1 },
      ];
      const { db } = buildDb(categories, tasks);
      const caller = appRouter.createCaller({ ...baseCtx, db });

      const res = await caller.board.updateTaskPosition({
        taskId: "t2",
        newCategoryId: "catB",
        newOrder: 1,
      });

      expect(res).toEqual({ success: true });
      assertContiguousOrders(tasks, "catA");
      assertContiguousOrders(tasks, "catB");
    }
  });

  it("updateTaskDetails updates title and description", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirstOrThrow.mockResolvedValueOnce({ id: "t1" });
    mockDb.task.update.mockResolvedValueOnce({
      id: "t1",
      title: "New",
      description: "Desc",
    });

    const res = await caller.board.updateTaskDetails({
      taskId: "t1",
      title: "New",
      description: "Desc",
    });

    expect(res).toEqual({ id: "t1", title: "New", description: "Desc" });
    expect(mockDb.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { title: "New", description: "Desc", createdAt: undefined },
    });
  });

  it("toggleTaskCompletion updates completed", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirstOrThrow.mockResolvedValueOnce({ id: "t1" });
    mockDb.task.update.mockResolvedValueOnce({ id: "t1", completed: true });

    const res = await caller.board.toggleTaskCompletion({ taskId: "t1", completed: true });
    expect(res).toEqual({ id: "t1", completed: true });
    expect(mockDb.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { completed: true },
    });
  });
});
