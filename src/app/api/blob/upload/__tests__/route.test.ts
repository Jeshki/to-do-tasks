/**
 * @vitest-environment node
 */

const authMock = vi.fn();
const putMock = vi.fn();

vi.mock("~/server/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => putMock(...args),
}));

import { File as UndiciFile, FormData as UndiciFormData } from "undici";
import { POST } from "../route";

const originalFile = globalThis.File;

beforeAll(() => {
  globalThis.File = UndiciFile as typeof File;
});

afterAll(() => {
  globalThis.File = originalFile;
});
describe("blob upload route", () => {
  beforeEach(() => {
    authMock.mockReset();
    putMock.mockReset();
  });

  it("returns 401 when no session", async () => {
    authMock.mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/blob/upload", { method: "POST" });
    const res = await POST(req);

    expect(res.status).toBe(401);
    await expect(res.text()).resolves.toBe("Unauthorized");
  });

  it("returns 400 when file is missing", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });

    const formData = new UndiciFormData();
    const req = { formData: async () => formData } as Request;

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.text()).resolves.toBe("Missing file");
  });

  it("uploads and returns blob url", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    putMock.mockResolvedValueOnce({ url: "https://example.com/file.jpg" });

    const formData = new UndiciFormData();
    formData.append("file", new UndiciFile(["file"], "photo.jpg", { type: "image/jpeg" }));

    const req = { formData: async () => formData } as Request;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ url: "https://example.com/file.jpg" });
  });

  it("returns error when upload fails", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    putMock.mockRejectedValueOnce(new Error("Upload failed"));

    const formData = new UndiciFormData();
    formData.append("file", new UndiciFile(["file"], "photo.jpg", { type: "image/jpeg" }));

    const req = { formData: async () => formData } as Request;

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.text()).resolves.toBe("Upload failed");
  });
});


