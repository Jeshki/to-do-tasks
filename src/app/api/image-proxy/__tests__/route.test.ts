import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock env to allow only utfs.io
vi.mock("~/env", () => ({
  env: {
    IMAGE_PROXY_ALLOWED_HOSTS: "utfs.io",
  },
}));

import { POST } from "../route";

describe("image-proxy route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("atmeta non-https", async () => {
    const req = new Request("http://localhost/api/image-proxy", {
      method: "POST",
      body: JSON.stringify({ url: "http://example.com/img.jpg" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Only https is allowed");
  });

  it("atmeta neleistiną hostą", async () => {
    const req = new Request("http://localhost/api/image-proxy", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/img.jpg" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Host not allowed");
  });

  it("grąžina base64 kai fetch pavyksta", async () => {
    const fakeBuffer = new TextEncoder().encode("hello");
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(fakeBuffer, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );

    const req = new Request("http://localhost/api/image-proxy", {
      method: "POST",
      body: JSON.stringify({ url: "https://utfs.io/abc.jpg" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.base64).toBeDefined();
    expect(json.contentType).toBe("image/jpeg");
  });
});
