import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { put, del } from "@vercel/blob";

const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"];
export const LOCAL_DIR = path.join(process.cwd(), ".uploads");

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/**
 * Optimiza la foto (máx. 2000 px, WebP, orientación corregida) y la guarda.
 * Producción: Vercel Blob. Desarrollo sin token: carpeta local .uploads.
 */
export async function saveImage(file: File, folder: "productos" | "colecciones" | "sitio") {
  if (!(file instanceof File) || file.size === 0) throw new Error("No se recibió ninguna imagen.");
  if (file.size > MAX_BYTES) throw new Error("La imagen supera 12 MB. Usa una foto más liviana.");
  if (file.type && !ACCEPTED.includes(file.type)) throw new Error("Formato no admitido. Usa JPG, PNG o WebP.");

  let output: { data: Buffer; info: { width: number; height: number } };
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new Error("No pudimos leer la imagen. Prueba con otro archivo JPG o PNG.");
  }

  const name = `${folder}/${randomUUID()}.webp`;
  if (useBlob()) {
    const blob = await put(name, output.data, {
      access: "public",
      contentType: "image/webp",
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return { url: blob.url, width: output.info.width, height: output.info.height };
  }

  if (process.env.VERCEL) throw new Error("Falta conectar Vercel Blob para guardar fotografías.");
  const target = path.join(LOCAL_DIR, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, output.data);
  return { url: `/api/uploads/${name}`, width: output.info.width, height: output.info.height };
}

/** Borra una foto que ya no se usa. Nunca interrumpe el guardado si falla. */
export async function deleteImage(url: string | null | undefined) {
  if (!url) return;
  try {
    if (url.startsWith("/api/uploads/")) {
      const rel = url.replace("/api/uploads/", "");
      if (rel.includes("..")) return;
      await unlink(path.join(LOCAL_DIR, rel));
    } else if (useBlob() && url.includes(".blob.vercel-storage.com")) {
      await del(url);
    }
  } catch (e) {
    console.warn("No se pudo borrar la imagen", url, e);
  }
}
