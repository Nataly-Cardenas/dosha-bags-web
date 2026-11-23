// Sirve las fotos guardadas localmente en desarrollo (sin Vercel Blob).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_DIR } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  if (parts.some((p) => p.includes("..") || p.includes("\\"))) return new Response("No válido", { status: 400 });
  const file = path.join(LOCAL_DIR, ...parts);
  if (!file.startsWith(LOCAL_DIR + path.sep)) return new Response("No válido", { status: 400 });
  try {
    const data = await readFile(file);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
