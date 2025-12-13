import { vi, describe, it, expect, beforeEach } from "vitest";

// Uždengiame NextAuth priklausomybę server/auth, kad vitest nereikalautų next/server
vi.mock("~/server/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "user1" } })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

import { appRouter } from "../root";

// In-memory mock DB
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

  it("createCategory priskiria userId ir order", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.category.findFirst.mockResolvedValueOnce({ order: 1 });
    mockDb.category.create.mockResolvedValueOnce({ id: "c1", title: "Test", order: 2 });

    const res = await caller.board.createCategory({ title: "Test" });
    expect(res).toEqual({ id: "c1", title: "Test", order: 2 });
    expect(mockDb.category.create).toHaveBeenCalledWith({
      data: { title: "Test", userId: "user1", order: 2, color: "#94a3b8" },
    });
  });

  it("createTask priskiria order ir user kategorijai", async () => {
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

  it("addCommentToTask sukuria komentarą", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirstOrThrow.mockResolvedValueOnce({ id: "t1" });
    mockDb.comment.create.mockResolvedValueOnce({ id: "cmt1", text: "Labas" });

    const res = await caller.board.addCommentToTask({ taskId: "t1", text: "Labas" });
    expect(res).toEqual({ id: "cmt1", text: "Labas" });
    expect(mockDb.comment.create).toHaveBeenCalledWith({
      data: { text: "Labas", taskId: "t1" },
    });
  });

  it("deleteCategory ištrina ir sureguliuoja order", async () => {
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

  it("deleteTask ištrina užduotį ir sureguliuoja order", async () => {
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

  it("addPhotoToTask sukuria nuotrauką kai priklauso vartotojui", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirst.mockResolvedValueOnce({ id: "t1", category: { userId: "user1" } });
    mockDb.photo.create.mockResolvedValueOnce({ id: "p1", url: "u" });

    const res = await caller.board.addPhotoToTask({ taskId: "t1", url: "http://x" });
    expect(res).toEqual({ id: "p1", url: "u" });
    expect(mockDb.photo.create).toHaveBeenCalledWith({
      data: { url: "http://x", taskId: "t1" },
    });
  });

  it("deletePhotoFromTask pašalina nuotrauką kai priklauso vartotojui", async () => {
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

  it("updateTaskPosition tarp kategorijų mažina seną ir įterpia naujoje", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirst.mockResolvedValueOnce({
      categoryId: "oldCat",
      order: 1,
    });

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

  it("updateTaskPosition toje pačioje kategorijoje perstato order", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.task.findFirst.mockResolvedValueOnce({
      categoryId: "cat1",
      order: 5,
    });
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
});
