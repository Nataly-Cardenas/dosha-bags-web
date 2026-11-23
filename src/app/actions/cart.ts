"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { cartSchema, type Quote } from "@/lib/cart-types";
import { quoteCart } from "@/lib/quote";
import { buildWhatsAppMessage, whatsappUrl } from "@/lib/commerce";
import { getSettings } from "@/lib/catalog";
import { ipHash } from "@/lib/auth";

export async function quoteCartAction(raw: unknown): Promise<{ ok: true; quote: Quote } | { ok: false; error: string }> {
  const parsed = cartSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "El carrito tiene datos no válidos. Vacíalo e inténtalo de nuevo." };
  try {
    return { ok: true, quote: await quoteCart(parsed.data) };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "No pudimos actualizar el carrito. Revisa tu conexión e inténtalo de nuevo." };
  }
}

const checkoutSchema = z.object({
  items: cartSchema.min(1),
  customerName: z.string().trim().max(80).optional().default(""),
  customerCity: z.string().trim().max(80).optional().default(""),
});

/**
 * Registra la solicitud como "pendiente" (NO pagada ni confirmada) y devuelve el enlace de WhatsApp.
 * La confirmación y el pago se coordinan después con la tienda.
 */
export async function checkoutAction(
  raw: unknown,
): Promise<{ ok: true; url: string; code: string; message: string } | { ok: false; error: string }> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Revisa los datos del pedido." };
  const { items, customerName, customerCity } = parsed.data;

  try {
    const [settings, quote, ip] = await Promise.all([getSettings(), quoteCart(items), ipHash()]);
    if (!quote.whatsappConfigured) return { ok: false, error: "La tienda aún no ha configurado su WhatsApp." };
    if (!quote.canCheckout) return { ok: false, error: "Revisa los productos marcados en el carrito." };

    // Límite anti-abuso: máx. 15 solicitudes por hora desde la misma conexión.
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(and(eq(schema.orders.ipHash, ip), gt(schema.orders.createdAt, new Date(Date.now() - 3600e3))));
    if (n >= 15) return { ok: false, error: "Has enviado muchas solicitudes. Escríbenos directamente por WhatsApp." };

    const lines = quote.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      name: l.name,
      reference: l.reference,
      color: l.color,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      subtotal: l.subtotal,
      personalization: l.personalization,
      immediateQty: l.immediateQty,
      madeToOrderQty: l.madeToOrderQty,
    }));

    const code = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.orders)
        .values({
          code: "tmp-" + crypto.randomUUID(),
          customerName,
          customerCity,
          items: lines,
          total: quote.total,
          hasMadeToOrder: quote.hasMadeToOrder,
          ipHash: ip,
        })
        .returning({ id: schema.orders.id });
      const code = "DB-" + String(row.id).padStart(4, "0");
      await tx.update(schema.orders).set({ code }).where(eq(schema.orders.id, row.id));
      return code;
    });

    const message = buildWhatsAppMessage({
      storeName: settings.storeName,
      code,
      lines,
      total: quote.total,
      mtoMinDays: quote.mtoMinDays,
      mtoMaxDays: quote.mtoMaxDays,
      customerName,
      customerCity,
    });
    return { ok: true, url: whatsappUrl(settings.whatsappNumber, message), code, message };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "No pudimos preparar tu pedido. Inténtalo de nuevo en un momento." };
  }
}
