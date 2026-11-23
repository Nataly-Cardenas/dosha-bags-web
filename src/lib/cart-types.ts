import { z } from "zod";
import type { AvailabilityKind } from "./commerce";

export const MAX_QTY = 20;
export const MAX_LINES = 30;

/** Lo único que guarda el navegador: identificadores, cantidad y personalización. Nunca precios. */
export const cartItemSchema = z.object({
  key: z.string().max(200),
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(MAX_QTY),
  personalization: z
    .object({
      text: z.string().max(60).optional(),
      options: z.record(z.string().max(80), z.string().max(80)).optional(),
    })
    .nullable()
    .optional(),
});
export const cartSchema = z.array(cartItemSchema).max(MAX_LINES);
export type CartItem = z.infer<typeof cartItemSchema>;

export type QuotedLine = {
  key: string;
  ok: boolean;
  error?: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  reference: string;
  color: string;
  colorHex: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  personalization: string | null;
  availability: AvailabilityKind;
  immediateQty: number;
  madeToOrderQty: number;
  maxQty: number;
  mtoMinDays: number;
  mtoMaxDays: number;
};

export type Quote = {
  lines: QuotedLine[];
  total: number;
  hasMadeToOrder: boolean;
  mtoMinDays: number;
  mtoMaxDays: number;
  canCheckout: boolean;
  whatsappConfigured: boolean;
};
