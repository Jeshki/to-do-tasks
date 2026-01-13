import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/env", () => ({
  env: {
    IMAGE_PROXY_ALLOWED_HOSTS: "utfs.io,example.com",
  },
}));

import { POST } from "../route";

describe("image-proxy route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects missing url", async () => {
    const req = new Request("http://localhost/api/image-proxy", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Missing url");
  });

  it("rejects non-https", async () => {
    const req = new Request("http://localhost/api/image-proxy", {
      method: "POST",
      body: JSON.stringify({ url: "http://example.com/img.jpg" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Only https is allowed");
  });

  it("rejects invalid url", async () => {
    const req = new Request("http://localhost/api/image-proxy", {
      method: "POST",
      body: JSON.stringify({ url: "notaurl" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal error");
  });

  it("rejects disallowed host", async () => {
    const req = new Request("http://localhost/api/image-proxy", {
      method: "POST",
      body: JSON.stringify({ url: "https://notallowed.com/img.jpg" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Host not allowed");
  });

  it("returns error when fetch fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(null, { status: 404 }));

    const req = new Request("http://localhost/api/image-proxy", {
      method: "POST",
      body: JSON.stringify({ url: "https://utfs.io/abc.jpg" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Failed to fetch image");
  });

  it("returns base64 when fetch succeeds", async () => {
    const fakeBuffer = new TextEncoder().encode("hello");
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(fakeBuffer, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );

    const req = new Request("http://localhost/api/image-proxy", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/abc.jpg" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.base64).toBeDefined();
    expect(json.contentType).toBe("image/jpeg");
  });
});
