import "server-only";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  availabilityOf,
  splitQuantity,
  validatePersonalization,
  describePersonalization,
  isValidWhatsappNumber,
} from "./commerce";
import type { CartItem, Quote, QuotedLine } from "./cart-types";
import { getSettings } from "./catalog";

/**
 * Calcula el carrito con datos de la base de datos (precios, nombres, disponibilidad).
 * El navegador solo aporta identificadores, cantidades y el texto de personalización.
 */
export async function quoteCart(items: CartItem[]): Promise<Quote> {
  const settings = await getSettings();
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = productIds.length
    ? await db.query.products.findMany({
        where: inArray(schema.products.id, productIds),
        with: { collection: true, variants: { with: { color: true } }, images: true },
      })
    : [];

  const lines: QuotedLine[] = items.map((item) => {
    const p = products.find((x) => x.id === item.productId);
    const v = p?.variants.find((x) => x.id === item.variantId);
    const base: QuotedLine = {
      key: item.key,
      ok: false,
      productId: item.productId,
      variantId: item.variantId,
      slug: p?.slug ?? "",
      name: p?.name ?? "Producto no disponible",
      reference: p?.reference ?? "",
      color: v?.color.name ?? "",
      colorHex: v?.color.hex ?? "#ccc",
      image: null,
      quantity: item.quantity,
      unitPrice: 0,
      subtotal: 0,
      personalization: null,
      availability: "unavailable",
      immediateQty: 0,
      madeToOrderQty: 0,
      maxQty: 0,
    };
    if (!p || !v || !p.isVisible || (p.collection && !p.collection.isVisible)) {
      return { ...base, error: "Este producto ya no está disponible. Elimínalo para continuar." };
    }
    const imgs = [...p.images].sort((a, b) => a.sortOrder - b.sortOrder);
    base.image = (imgs.find((i) => i.variantId === v.id) ?? imgs[0])?.url ?? null;
    base.availability = availabilityOf(v);

    const pers = validatePersonalization(p, item.personalization);
    if (!pers.ok) return { ...base, error: pers.error };
    base.personalization = describePersonalization(pers.value);

    const split = splitQuantity(v, item.quantity);
    base.maxQty = base.availability === "immediate" && !v.allowMadeToOrder ? v.stock : 20;
    if (!split.ok) {
      return {
        ...base,
        error:
          base.availability === "unavailable"
            ? "Este color está temporalmente no disponible."
            : `Solo hay ${v.stock} unidad(es) disponibles en este color.`,
      };
    }
    const unitPrice = (v.priceOverride ?? p.price) + pers.extra;
    return {
      ...base,
      ok: true,
      unitPrice,
      subtotal: unitPrice * item.quantity,
      immediateQty: split.immediateQty,
      madeToOrderQty: split.madeToOrderQty,
    };
  });

  const valid = lines.filter((l) => l.ok);
  const whatsappConfigured = isValidWhatsappNumber(settings.whatsappNumber);
  return {
    lines,
    total: valid.reduce((s, l) => s + l.subtotal, 0),
    hasMadeToOrder: valid.some((l) => l.madeToOrderQty > 0),
    mtoMinDays: settings.madeToOrderMinDays,
    mtoMaxDays: settings.madeToOrderMaxDays,
    canCheckout: lines.length > 0 && lines.every((l) => l.ok) && whatsappConfigured,
    whatsappConfigured,
  };
}
