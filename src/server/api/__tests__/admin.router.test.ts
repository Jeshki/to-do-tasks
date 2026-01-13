import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "admin1", role: "ADMIN" } })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "hashed"),
  },
  hash: vi.fn(async () => "hashed"),
}));

import bcrypt from "bcryptjs";
import { appRouter } from "../root";

const mockDb = {
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  },
};

const baseCtx = {
  db: mockDb as any,
  session: {
    user: { id: "admin1", email: "admin@test.lt", name: "Admin", role: "ADMIN" },
    expires: new Date().toISOString(),
  },
  headers: new Headers(),
};

describe("adminRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listUsers grazina vartotoju sarasa", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.user.findMany.mockResolvedValueOnce([
      { id: "u1", email: "a@test.lt", name: "A", role: "EMPLOYEE" },
    ]);

    const res = await caller.admin.listUsers();
    expect(res).toHaveLength(1);
    expect(res[0]?.email).toBe("a@test.lt");
  });

  it("createUser sukuria vartotoja su hashed slaptazodziu", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.user.findUnique.mockResolvedValueOnce(null);
    mockDb.user.create.mockResolvedValueOnce({
      id: "u2",
      email: "new@test.lt",
      name: "Test User",
      role: "EMPLOYEE",
    });

    const res = await caller.admin.createUser({
      email: "new@test.lt",
      password: "password123",
      name: "Test User",
    });

    expect(res.email).toBe("new@test.lt");
    expect(mockDb.user.create).toHaveBeenCalledWith({
      data: {
        email: "new@test.lt",
        name: "Test User",
        role: "EMPLOYEE",
        passwordHash: "hashed",
      },
      select: { id: true, email: true, name: true, role: true },
    });
  });

  it("createUser atmeta konflikta", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.user.findUnique.mockResolvedValueOnce({ id: "u1" });

    await expect(
      caller.admin.createUser({
        email: "new@test.lt",
        password: "password123",
        name: "Test User",
      }),
    ).rejects.toThrow("User already exists");
  });

  it("resetUserPassword hashina slaptazodi ir atnaujina", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.user.update.mockResolvedValueOnce({ id: "u1" });

    const res = await caller.admin.resetUserPassword({ userId: "u1", password: "password123" });

    expect(res).toEqual({ success: true });
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12);
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { passwordHash: "hashed" },
    });
  });

  it("deleteUser neleidzia istrinti paskutinio admino", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.user.findUnique.mockResolvedValueOnce({ id: "admin2", role: "ADMIN" });
    mockDb.user.count.mockResolvedValueOnce(1);

    await expect(caller.admin.deleteUser({ userId: "admin2" })).rejects.toThrow(
      "Cannot delete last admin",
    );
  });

  it("deleteUser neleidzia istrinti savo vartotojo", async () => {
    const caller = appRouter.createCaller(baseCtx);
    await expect(caller.admin.deleteUser({ userId: "admin1" })).rejects.toThrow(
      "Cannot delete your own user",
    );
  });

  it("deleteUser grazina not found", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.user.findUnique.mockResolvedValueOnce(null);

    await expect(caller.admin.deleteUser({ userId: "missing" })).rejects.toThrow(
      "User not found",
    );
  });

  it("deleteUser pasalina vartotoja", async () => {
    const caller = appRouter.createCaller(baseCtx);
    mockDb.user.findUnique.mockResolvedValueOnce({ id: "u2", role: "EMPLOYEE" });
    mockDb.user.delete.mockResolvedValueOnce({ id: "u2" });

    const res = await caller.admin.deleteUser({ userId: "u2" });

    expect(res).toEqual({ success: true });
    expect(mockDb.user.delete).toHaveBeenCalledWith({ where: { id: "u2" } });
  });
});
