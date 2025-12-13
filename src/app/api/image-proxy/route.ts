import { NextResponse } from "next/server";
import { env } from "~/env";

const allowedHosts = () => {
  const fromEnv = env.IMAGE_PROXY_ALLOWED_HOSTS
    ? env.IMAGE_PROXY_ALLOWED_HOSTS.split(",").map((v) => v.trim()).filter(Boolean)
    : [];
  return new Set(fromEnv.length > 0 ? fromEnv : ["utfs.io"]);
};

export async function POST(request: Request) {
  try {
    const { url } = (await request.json()) as { url?: string };
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Only https is allowed" }, { status: 400 });
    }
    const hosts = allowedHosts();
    if (!hosts.has(parsed.hostname)) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
    }

    const resp = await fetch(parsed.toString());
    if (!resp.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 400 });
    }

    const arrayBuffer = await resp.arrayBuffer();
    const contentType = resp.headers.get("content-type") ?? "image/jpeg";
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return NextResponse.json({
      base64,
      contentType,
    });
  } catch (error) {
    console.error("Image proxy error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
