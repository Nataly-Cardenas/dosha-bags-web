/**
 * Reduce la foto en el navegador antes de subirla (máx. 2400 px, JPEG ~90%).
 * Así las fotos del celular (5–10 MB) suben rápido y no superan el límite del servidor.
 */
export async function compressImage(file: File, maxSide = 2400): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  if (file.size < 1.5 * 1024 * 1024 && /jpe?g|webp/.test(file.type)) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (file.size < 3.5 * 1024 * 1024) return file; // el servidor intentará leerla
    throw new Error("No pudimos leer esta foto. Prueba exportándola como JPG.");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  for (const q of [0.9, 0.8, 0.7]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size < 3.5 * 1024 * 1024) return blob;
  }
  throw new Error("La foto es demasiado pesada incluso después de reducirla.");
}
