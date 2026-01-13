import { put } from "@vercel/blob";
import { auth } from "~/server/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return new Response("Missing file", { status: 400 });
  }

  try {
    const blob = await put(file.name, file, { access: "public" });
    return Response.json({ url: blob.url });
  } catch (error: any) {
    const message = error?.message ?? "Upload failed";
    return new Response(message, { status: 400 });
  }
}
