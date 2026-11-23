"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import {
  assertAdmin,
  clientIp,
  comparePassword,
  createSession,
  destroySession,
  hashPassword,
  recordFailedAttempt,
  tooManyAttempts,
  verifyCredentials,
} from "@/lib/auth";
import { deleteImage, saveImage } from "@/lib/storage";
import { isValidWhatsappNumber, slugify } from "@/lib/commerce";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** La tienda pública se actualiza en cuanto se guarda un cambio. */
function refreshStore() {
  revalidatePath("/", "layout");
}

function firstIssue(e: z.ZodError) {
  const i = e.issues[0];
  return i ? i.message : "Revisa los datos del formulario.";
}

function dbError(e: unknown, fallback: string): { ok: false; error: string } {
  const code = (e as { code?: string; cause?: { code?: string } })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
  if (code === "23505") return { ok: false, error: "Ya existe un registro con ese nombre o dirección web (slug). Usa otro." };
  if (code === "23503") return { ok: false, error: "No se puede eliminar porque está en uso." };
  console.error(e);
  return { ok: false, error: fallback };
}

/* ─────────────────────────── Sesión ─────────────────────────── */

export async function loginAction(_: unknown, form: FormData): Promise<{ error?: string; email?: string }> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Escribe tu correo y contraseña.", email };
  const key = `${await clientIp()}|${email}`;
  if (await tooManyAttempts(key)) return { error: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.", email };
  const user = await verifyCredentials(email, password);
  if (!user) {
    await recordFailedAttempt(key);
    return { error: "Correo o contraseña incorrectos.", email };
  }
  await createSession(user.id);
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

/* ─────────────────────────── Imágenes ─────────────────────────── */

export async function uploadImageAction(
  form: FormData,
): Promise<ActionResult<{ url: string; width: number; height: number }>> {
  await assertAdmin();
  const folder = String(form.get("folder") ?? "productos");
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No se recibió ninguna imagen." };
  try {
    const res = await saveImage(file, folder === "colecciones" || folder === "sitio" ? folder : "productos");
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo subir la imagen." };
  }
}

/* ─────────────────────────── Productos ─────────────────────────── */

const money = z.coerce.number({ message: "Escribe un precio válido." }).int("El precio no lleva decimales.").min(0).max(100_000_000);

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Escribe el nombre del producto.").max(120),
  reference: z.string().trim().min(1, "Escribe la referencia del producto.").max(40),
  slug: z.string().trim().max(80).optional().default(""),
  collectionId: z.string().uuid().nullable(),
  categoryId: z.string().uuid().nullable(),
  description: z.string().max(5000).default(""),
  details: z.string().max(5000).default(""),
  care: z.string().max(3000).default(""),
  price: money.refine((n) => n > 0, "El precio debe ser mayor que cero."),
  isVisible: z.boolean(),
  isFeatured: z.boolean(),
  isNew: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  personalizationEnabled: z.boolean(),
  personalizationLabel: z.string().trim().max(60).default("Iniciales o nombre"),
  personalizationMaxChars: z.coerce.number().int().min(1, "Mínimo 1 carácter.").max(30, "Máximo 30 caracteres."),
  personalizationPrice: money,
  personalizationCharset: z.enum(["letters", "letters_numbers"]),
  personalizationRequired: z.boolean(),
  personalizationNote: z.string().max(300).default(""),
  personalizationOptions: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Cada opción de personalización necesita un nombre.").max(60),
        choices: z
          .array(
            z.object({
              name: z.string().trim().min(1, "Cada alternativa necesita un nombre.").max(60),
              price: money,
              hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
            }),
          )
          .min(1, "Cada opción necesita al menos una alternativa.")
          .max(20),
      }),
    )
    .max(5),
  variants: z
    .array(
      z.object({
        id: z.string().uuid(),
        colorId: z.string().uuid("Elige un color para cada variante."),
        status: z.enum(["in_stock", "made_to_order", "unavailable"]),
        stock: z.coerce.number().int().min(0, "El inventario no puede ser negativo.").max(9999),
        allowMadeToOrder: z.boolean(),
        priceOverride: money.nullable(),
      }),
    )
    .min(1, "Agrega al menos un color.")
    .max(30),
  images: z
    .array(
      z.object({
        url: z.string().min(1).max(500),
        alt: z.string().max(200).default(""),
        variantId: z.string().uuid().nullable(),
        width: z.number().int().nullable().optional(),
        height: z.number().int().nullable().optional(),
      }),
    )
    .max(40),
});
export type ProductInput = z.input<typeof productSchema>;

export async function saveProductAction(raw: ProductInput): Promise<ActionResult<{ id: string }>> {
  await assertAdmin();
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const d = parsed.data;

  const colorIds = d.variants.map((v) => v.colorId);
  if (new Set(colorIds).size !== colorIds.length) return { ok: false, error: "Hay colores repetidos en las variantes." };
  const variantIds = new Set(d.variants.map((v) => v.id));
  for (const img of d.images) {
    if (img.variantId && !variantIds.has(img.variantId)) img.variantId = null;
    if (!img.url.startsWith("/api/uploads/") && !/^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(img.url)) {
      return { ok: false, error: "Una de las fotos no es válida. Vuelve a subirla." };
    }
  }

  const slug = slugify(d.slug || d.name) || slugify(d.reference);
  const values = {
    name: d.name,
    reference: d.reference,
    slug,
    collectionId: d.collectionId,
    categoryId: d.categoryId,
    description: d.description,
    details: d.details,
    care: d.care,
    price: d.price,
    isVisible: d.isVisible,
    isFeatured: d.isFeatured,
    isNew: d.isNew,
    sortOrder: d.sortOrder,
    personalizationEnabled: d.personalizationEnabled,
    personalizationLabel: d.personalizationLabel || "Iniciales o nombre",
    personalizationMaxChars: d.personalizationMaxChars,
    personalizationPrice: d.personalizationPrice,
    personalizationCharset: d.personalizationCharset,
    personalizationRequired: d.personalizationRequired,
    personalizationNote: d.personalizationNote,
    personalizationOptions: d.personalizationOptions,
    updatedAt: new Date(),
  };

  let removedUrls: string[] = [];
  try {
    const id = await db.transaction(async (tx) => {
      let productId = d.id;
      if (productId) {
        const [row] = await tx.update(schema.products).set(values).where(eq(schema.products.id, productId)).returning({ id: schema.products.id });
        if (!row) throw Object.assign(new Error("not found"), { userMessage: "El producto ya no existe." });
      } else {
        const [row] = await tx.insert(schema.products).values(values).returning({ id: schema.products.id });
        productId = row.id;
      }

      // Variantes: eliminar las quitadas, actualizar o crear el resto.
      const ids = d.variants.map((v) => v.id);
      // Las variantes existentes deben pertenecer a este producto.
      const foreign = await tx
        .select({ id: schema.productVariants.id })
        .from(schema.productVariants)
        .where(and(inArray(schema.productVariants.id, ids), ne(schema.productVariants.productId, productId)));
      if (foreign.length) throw Object.assign(new Error("foreign"), { userMessage: "Datos de variantes no válidos. Recarga la página." });

      await tx
        .delete(schema.productVariants)
        .where(and(eq(schema.productVariants.productId, productId), notInArray(schema.productVariants.id, ids)));
      // Evita choques de color mientras se reordenan.
      for (const [i, v] of d.variants.entries()) {
        await tx
          .insert(schema.productVariants)
          .values({ ...v, productId, sortOrder: i })
          .onConflictDoUpdate({
            target: schema.productVariants.id,
            set: {
              colorId: v.colorId,
              status: v.status,
              stock: v.stock,
              allowMadeToOrder: v.allowMadeToOrder,
              priceOverride: v.priceOverride,
              sortOrder: i,
            },
          });
      }

      // Fotos: se reemplaza la lista completa en el orden indicado.
      const before = await tx
        .select({ url: schema.productImages.url })
        .from(schema.productImages)
        .where(eq(schema.productImages.productId, productId));
      const keep = new Set(d.images.map((i) => i.url));
      removedUrls = before.map((b) => b.url).filter((u) => !keep.has(u));
      await tx.delete(schema.productImages).where(eq(schema.productImages.productId, productId));
      if (d.images.length) {
        await tx.insert(schema.productImages).values(
          d.images.map((img, i) => ({
            productId: productId!,
            variantId: img.variantId,
            url: img.url,
            alt: img.alt,
            width: img.width ?? null,
            height: img.height ?? null,
            sortOrder: i,
          })),
        );
      }
      return productId;
    });
    await Promise.all(removedUrls.map(deleteImage));
    refreshStore();
    return { ok: true, id };
  } catch (e) {
    const msg = (e as { userMessage?: string }).userMessage;
    if (msg) return { ok: false, error: msg };
    return dbError(e, "No se pudo guardar el producto. Inténtalo de nuevo.");
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Producto no válido." };
  const imgs = await db.select({ url: schema.productImages.url }).from(schema.productImages).where(eq(schema.productImages.productId, id));
  await db.delete(schema.products).where(eq(schema.products.id, id));
  await Promise.all(imgs.map((i) => deleteImage(i.url)));
  refreshStore();
  return { ok: true };
}

export async function toggleProductAction(id: string, field: "isVisible" | "isFeatured", value: boolean): Promise<ActionResult> {
  await assertAdmin();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Producto no válido." };
  await db
    .update(schema.products)
    .set(field === "isVisible" ? { isVisible: value, updatedAt: new Date() } : { isFeatured: value, updatedAt: new Date() })
    .where(eq(schema.products.id, id));
  refreshStore();
  return { ok: true };
}

export async function duplicateProductAction(id: string): Promise<ActionResult<{ id: string }>> {
  await assertAdmin();
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, id), with: { variants: true } });
  if (!p) return { ok: false, error: "El producto no existe." };
  const suffix = Math.random().toString(36).slice(2, 6);
  const { id: _omit, createdAt: _c, updatedAt: _u, variants, ...rest } = p;
  void _omit; void _c; void _u;
  const [row] = await db
    .insert(schema.products)
    .values({ ...rest, name: `${p.name} (copia)`, slug: `${p.slug}-copia-${suffix}`, isVisible: false })
    .returning({ id: schema.products.id });
  if (variants.length) {
    await db.insert(schema.productVariants).values(
      variants.map(({ id: _v, productId: _p, ...v }) => {
        void _v; void _p;
        return { ...v, productId: row.id };
      }),
    );
  }
  return { ok: true, id: row.id };
}

/* ─────────────────────────── Inventario rápido ─────────────────────────── */

const variantUpdate = z.object({
  id: z.string().uuid(),
  status: z.enum(["in_stock", "made_to_order", "unavailable"]),
  stock: z.coerce.number().int().min(0).max(9999),
  allowMadeToOrder: z.boolean(),
});

export async function updateVariantAction(raw: z.input<typeof variantUpdate>): Promise<ActionResult> {
  await assertAdmin();
  const p = variantUpdate.safeParse(raw);
  if (!p.success) return { ok: false, error: "Revisa el inventario (número entero, 0 o más)." };
  const { id, ...rest } = p.data;
  await db.update(schema.productVariants).set(rest).where(eq(schema.productVariants.id, id));
  refreshStore();
  return { ok: true };
}

/* ─────────────────────────── Colecciones ─────────────────────────── */

const collectionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Escribe el nombre de la colección.").max(80),
  slug: z.string().trim().max(80).optional().default(""),
  description: z.string().max(1000).default(""),
  imageUrl: z.string().max(500).nullable(),
  isVisible: z.boolean(),
  isFeatured: z.boolean(),
});

export async function saveCollectionAction(raw: z.input<typeof collectionSchema>): Promise<ActionResult<{ id: string }>> {
  await assertAdmin();
  const p = collectionSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: firstIssue(p.error) };
  const { id, ...d } = p.data;
  const values = { ...d, slug: slugify(d.slug || d.name) };
  try {
    let oldImage: string | null = null;
    let newId = id;
    if (id) {
      const [prev] = await db.select({ imageUrl: schema.collections.imageUrl }).from(schema.collections).where(eq(schema.collections.id, id));
      oldImage = prev?.imageUrl ?? null;
      await db.update(schema.collections).set(values).where(eq(schema.collections.id, id));
    } else {
      const [{ max }] = await db.select({ max: sql<number>`coalesce(max(sort_order), -1)::int` }).from(schema.collections);
      const [row] = await db.insert(schema.collections).values({ ...values, sortOrder: max + 1 }).returning({ id: schema.collections.id });
      newId = row.id;
    }
    if (oldImage && oldImage !== values.imageUrl) await deleteImage(oldImage);
    refreshStore();
    return { ok: true, id: newId! };
  } catch (e) {
    return dbError(e, "No se pudo guardar la colección.");
  }
}

export async function deleteCollectionAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  const [row] = await db.delete(schema.collections).where(eq(schema.collections.id, id)).returning({ imageUrl: schema.collections.imageUrl });
  await deleteImage(row?.imageUrl);
  refreshStore();
  return { ok: true };
}

export async function moveAction(table: "collections" | "categories", id: string, dir: -1 | 1): Promise<ActionResult> {
  await assertAdmin();
  const t = table === "collections" ? schema.collections : schema.categories;
  const rows = await db.select({ id: t.id }).from(t).orderBy(t.sortOrder, t.name);
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return { ok: true };
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await db.transaction(async (tx) => {
    for (const [k, r] of rows.entries()) await tx.update(t).set({ sortOrder: k }).where(eq(t.id, r.id));
  });
  refreshStore();
  return { ok: true };
}

/* ─────────────────────────── Categorías y colores ─────────────────────────── */

export async function saveCategoryAction(raw: { id?: string; name: string }): Promise<ActionResult> {
  await assertAdmin();
  const p = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(2, "Escribe el nombre.").max(60) }).safeParse(raw);
  if (!p.success) return { ok: false, error: firstIssue(p.error) };
  try {
    if (p.data.id) {
      await db.update(schema.categories).set({ name: p.data.name, slug: slugify(p.data.name) }).where(eq(schema.categories.id, p.data.id));
    } else {
      const [{ max }] = await db.select({ max: sql<number>`coalesce(max(sort_order), -1)::int` }).from(schema.categories);
      await db.insert(schema.categories).values({ name: p.data.name, slug: slugify(p.data.name), sortOrder: max + 1 });
    }
    refreshStore();
    return { ok: true };
  } catch (e) {
    return dbError(e, "No se pudo guardar la categoría.");
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  await db.delete(schema.categories).where(eq(schema.categories.id, id));
  refreshStore();
  return { ok: true };
}

const colorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Escribe el nombre del color.").max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Elige un tono válido."),
});

export async function saveColorAction(raw: z.input<typeof colorSchema>): Promise<ActionResult<{ id: string }>> {
  await assertAdmin();
  const p = colorSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: firstIssue(p.error) };
  try {
    if (p.data.id) {
      await db.update(schema.colors).set({ name: p.data.name, hex: p.data.hex }).where(eq(schema.colors.id, p.data.id));
      refreshStore();
      return { ok: true, id: p.data.id };
    }
    const [row] = await db.insert(schema.colors).values({ name: p.data.name, hex: p.data.hex }).returning({ id: schema.colors.id });
    return { ok: true, id: row.id };
  } catch (e) {
    return dbError(e, "No se pudo guardar el color.");
  }
}

export async function deleteColorAction(id: string): Promise<ActionResult> {
  await assertAdmin();
  try {
    await db.delete(schema.colors).where(eq(schema.colors.id, id));
    return { ok: true };
  } catch (e) {
    const r = dbError(e, "No se pudo eliminar el color.");
    return r.error.startsWith("No se puede eliminar")
      ? { ok: false, error: "Este color está asignado a uno o más productos. Quítalo de esos productos primero." }
      : r;
  }
}

/* ─────────────────────────── Solicitudes de pedido ─────────────────────────── */

export async function updateOrderAction(raw: { id: number; status: string; adminNote: string }): Promise<ActionResult> {
  await assertAdmin();
  const p = z
    .object({
      id: z.number().int(),
      status: z.enum(["pendiente", "confirmado", "pagado", "enviado", "entregado", "cancelado"]),
      adminNote: z.string().max(1000),
    })
    .safeParse(raw);
  if (!p.success) return { ok: false, error: "Datos no válidos." };
  await db.update(schema.orders).set({ status: p.data.status, adminNote: p.data.adminNote }).where(eq(schema.orders.id, p.data.id));
  revalidatePath("/admin/pedidos");
  return { ok: true };
}

/* ─────────────────────────── Ajustes ─────────────────────────── */

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => !v || /^https?:\/\//.test(v), "El enlace debe empezar por https://");

const settingsSchema = z
  .object({
    storeName: z.string().trim().min(2, "Escribe el nombre de la tienda.").max(60),
    whatsappNumber: z
      .string()
      .trim()
      .max(30)
      .refine((v) => !v || isValidWhatsappNumber(v), "El número de WhatsApp no es válido. Ej.: 300 123 4567"),
    instagramUrl: optionalUrl,
    email: z.union([z.literal(""), z.string().trim().email("El correo no es válido.")]),
    city: z.string().trim().max(60),
    announcement: z.string().trim().max(140),
    seoDescription: z.string().trim().max(300),
    heroEyebrow: z.string().trim().max(60),
    heroTitle: z.string().trim().min(2, "Escribe el título de la portada.").max(120),
    heroSubtitle: z.string().trim().max(300),
    heroImageUrl: z.string().max(500).nullable(),
    heroCtaLabel: z.string().trim().max(40),
    editorialTitle: z.string().trim().max(120),
    editorialBody: z.string().max(2000),
    editorialImageUrl: z.string().max(500).nullable(),
    aboutTitle: z.string().trim().max(120),
    aboutBody: z.string().max(8000),
    aboutImageUrl: z.string().max(500).nullable(),
    shippingText: z.string().max(5000),
    madeToOrderText: z.string().max(5000),
    returnsText: z.string().max(5000),
    contactText: z.string().max(2000),
    madeToOrderMinDays: z.coerce.number().int().min(1).max(60),
    madeToOrderMaxDays: z.coerce.number().int().min(1).max(60),
  })
  .refine((s) => s.madeToOrderMaxDays >= s.madeToOrderMinDays, "El máximo de días debe ser mayor o igual al mínimo.");
export type SettingsInput = z.input<typeof settingsSchema>;

export async function saveSettingsAction(raw: SettingsInput): Promise<ActionResult> {
  await assertAdmin();
  const p = settingsSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: firstIssue(p.error) };
  const [prev] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));
  await db.update(schema.settings).set({ ...p.data, updatedAt: new Date() }).where(eq(schema.settings.id, 1));
  for (const k of ["heroImageUrl", "editorialImageUrl", "aboutImageUrl"] as const) {
    if (prev?.[k] && prev[k] !== p.data[k]) await deleteImage(prev[k]);
  }
  refreshStore();
  return { ok: true };
}

/* ─────────────────────────── Cuentas ─────────────────────────── */

const passwordRule = z.string().min(10, "La contraseña debe tener al menos 10 caracteres.").max(200);

export async function changePasswordAction(raw: { current: string; next: string }): Promise<ActionResult> {
  const admin = await assertAdmin();
  const p = z.object({ current: z.string(), next: passwordRule }).safeParse(raw);
  if (!p.success) return { ok: false, error: firstIssue(p.error) };
  const [user] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, admin.id));
  if (!user || !(await comparePassword(p.data.current, user.passwordHash))) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }
  await db.update(schema.adminUsers).set({ passwordHash: await hashPassword(p.data.next) }).where(eq(schema.adminUsers.id, admin.id));
  // Cierra las demás sesiones abiertas con la contraseña anterior.
  await db.delete(schema.adminSessions).where(eq(schema.adminSessions.userId, admin.id));
  await createSession(admin.id);
  return { ok: true };
}

export async function createAdminAction(raw: { email: string; name: string; password: string }): Promise<ActionResult> {
  await assertAdmin();
  const p = z
    .object({ email: z.string().trim().toLowerCase().email("El correo no es válido."), name: z.string().trim().max(60), password: passwordRule })
    .safeParse(raw);
  if (!p.success) return { ok: false, error: firstIssue(p.error) };
  try {
    await db.insert(schema.adminUsers).values({ email: p.data.email, name: p.data.name, passwordHash: await hashPassword(p.data.password) });
    revalidatePath("/admin/cuenta");
    return { ok: true };
  } catch (e) {
    return dbError(e, "No se pudo crear la cuenta.");
  }
}

export async function resetAdminPasswordAction(raw: { id: string; password: string }): Promise<ActionResult> {
  await assertAdmin();
  const p = z.object({ id: z.string().uuid(), password: passwordRule }).safeParse(raw);
  if (!p.success) return { ok: false, error: firstIssue(p.error) };
  await db.update(schema.adminUsers).set({ passwordHash: await hashPassword(p.data.password) }).where(eq(schema.adminUsers.id, p.data.id));
  await db.delete(schema.adminSessions).where(eq(schema.adminSessions.userId, p.data.id));
  return { ok: true };
}

export async function deleteAdminAction(id: string): Promise<ActionResult> {
  const admin = await assertAdmin();
  if (id === admin.id) return { ok: false, error: "No puedes eliminar tu propia cuenta." };
  await db.delete(schema.adminUsers).where(eq(schema.adminUsers.id, id));
  revalidatePath("/admin/cuenta");
  return { ok: true };
}
