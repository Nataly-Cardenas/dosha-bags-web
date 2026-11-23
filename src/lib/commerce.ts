/**
 * Reglas de negocio puras (sin base de datos), compartidas por servidor y navegador.
 * El servidor SIEMPRE recalcula precios y disponibilidad con estas funciones a partir
 * de la base de datos; el navegador solo las usa para mostrar información previa.
 */

export type VariantStatus = "in_stock" | "made_to_order" | "unavailable";
export type AvailabilityKind = "immediate" | "made_to_order" | "unavailable";

export type VariantStock = {
  status: VariantStatus;
  stock: number;
  allowMadeToOrder: boolean;
};

export function availabilityOf(v: VariantStock): AvailabilityKind {
  if (v.status === "unavailable") return "unavailable";
  if (v.status === "made_to_order") return "made_to_order";
  if (v.stock > 0) return "immediate";
  return v.allowMadeToOrder ? "made_to_order" : "unavailable";
}

export const AVAILABILITY_LABEL: Record<AvailabilityKind, string> = {
  immediate: "Disponible · entrega inmediata",
  made_to_order: "Bajo pedido",
  unavailable: "Temporalmente no disponible",
};

/**
 * Reparte una cantidad entre unidades en inventario y unidades por encargo.
 * Ej.: hay 1 en inventario, se piden 3 y se permite encargo → 1 inmediata + 2 por encargo.
 */
export function splitQuantity(v: VariantStock, qty: number) {
  const kind = availabilityOf(v);
  if (kind === "unavailable") return { ok: false as const, immediateQty: 0, madeToOrderQty: 0 };
  if (kind === "made_to_order") return { ok: true as const, immediateQty: 0, madeToOrderQty: qty };
  const immediateQty = Math.min(qty, v.stock);
  const rest = qty - immediateQty;
  if (rest > 0 && !v.allowMadeToOrder) {
    return { ok: false as const, immediateQty, madeToOrderQty: 0, maxQty: v.stock };
  }
  return { ok: true as const, immediateQty, madeToOrderQty: rest };
}

/* ─────────────────────────── Personalización ─────────────────────────── */

export type PersonalizationConfig = {
  personalizationEnabled: boolean;
  personalizationLabel: string;
  personalizationMaxChars: number;
  personalizationPrice: number;
  personalizationCharset: string; // "letters" | "letters_numbers"
  personalizationRequired: boolean;
  personalizationOptions: { label: string; choices: { name: string; price: number; hex?: string }[] }[];
};

export type PersonalizationInput = { text?: string; options?: Record<string, string> } | null | undefined;

export type PersonalizationResult =
  | { ok: true; value: null; extra: 0 }
  | {
      ok: true;
      value: { text: string; options: { label: string; choice: string; price: number }[] };
      extra: number;
    }
  | { ok: false; error: string };

const LETTERS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ .&'-]+$/;
const LETTERS_NUMBERS = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .&'-]+$/;

export function charsetHint(charset: string) {
  return charset === "letters_numbers" ? "Letras, números, espacios y . & ' -" : "Letras, espacios y . & ' -";
}

export function validatePersonalization(cfg: PersonalizationConfig, input: PersonalizationInput): PersonalizationResult {
  const text = (input?.text ?? "").replace(/\s+/g, " ").trim();
  if (!cfg.personalizationEnabled) {
    if (text) return { ok: false, error: "Este producto no admite personalización." };
    return { ok: true, value: null, extra: 0 };
  }
  if (!text) {
    if (cfg.personalizationRequired) return { ok: false, error: `Escribe ${cfg.personalizationLabel.toLowerCase()}.` };
    return { ok: true, value: null, extra: 0 };
  }
  if (text.length > cfg.personalizationMaxChars) {
    return { ok: false, error: `Máximo ${cfg.personalizationMaxChars} caracteres.` };
  }
  const re = cfg.personalizationCharset === "letters_numbers" ? LETTERS_NUMBERS : LETTERS;
  if (!re.test(text)) return { ok: false, error: `Caracteres permitidos: ${charsetHint(cfg.personalizationCharset)}.` };

  const chosen: { label: string; choice: string; price: number }[] = [];
  for (const opt of cfg.personalizationOptions) {
    if (!opt.choices.length) continue;
    const selected = input?.options?.[opt.label] ?? opt.choices[0].name;
    const choice = opt.choices.find((c) => c.name === selected);
    if (!choice) return { ok: false, error: `Opción no válida para "${opt.label}".` };
    chosen.push({ label: opt.label, choice: choice.name, price: Math.max(0, choice.price) });
  }
  const extra = cfg.personalizationPrice + chosen.reduce((s, c) => s + c.price, 0);
  return { ok: true, value: { text, options: chosen }, extra };
}

export function describePersonalization(p: { text: string; options: { label: string; choice: string }[] } | null) {
  if (!p) return null;
  const opts = p.options.map((o) => `${o.label}: ${o.choice}`).join(", ");
  return opts ? `"${p.text}" (${opts})` : `"${p.text}"`;
}

/* ─────────────────────────── Formato ─────────────────────────── */

export function formatCOP(value: number) {
  return "$" + Math.round(value).toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

/* ─────────────────────────── WhatsApp ─────────────────────────── */

/** Deja solo dígitos y añade el indicativo de Colombia (57) a celulares de 10 dígitos. */
export function normalizeWhatsappNumber(raw: string) {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("3")) return "57" + digits;
  return digits;
}

export function isValidWhatsappNumber(raw: string) {
  const n = normalizeWhatsappNumber(raw);
  return n.length >= 10 && n.length <= 15;
}

export type MessageLine = {
  name: string;
  reference: string;
  color: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  personalization: string | null;
  immediateQty: number;
  madeToOrderQty: number;
};

export function buildWhatsAppMessage(input: {
  storeName: string;
  code?: string;
  lines: MessageLine[];
  total: number;
  mtoMinDays: number;
  mtoMaxDays: number;
  customerName?: string;
  customerCity?: string;
}) {
  const days = `${input.mtoMinDays}-${input.mtoMaxDays} días hábiles`;
  const out: string[] = [];
  out.push(`Hola, ${input.storeName}. Me gustaría realizar el siguiente pedido:`);
  if (input.code) out.push(`Solicitud: ${input.code}`);
  out.push("");

  input.lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.name} (Ref. ${l.reference})`);
    out.push(`Color: ${l.color}`);
    out.push(`Cantidad: ${l.quantity}`);
    out.push(`Personalización: ${l.personalization ?? "Ninguna"}`);
    if (l.madeToOrderQty > 0 && l.immediateQty > 0) {
      out.push(
        `Disponibilidad: ${l.immediateQty} para entrega inmediata y ${l.madeToOrderQty} bajo pedido (fabricación ${days})`,
      );
    } else if (l.madeToOrderQty > 0) {
      out.push(`Disponibilidad: Fabricación bajo pedido (${days})`);
    } else {
      out.push("Disponibilidad: Entrega inmediata");
    }
    out.push(`Precio unitario: ${formatCOP(l.unitPrice)}`);
    out.push(`Subtotal: ${formatCOP(l.subtotal)}`);
    out.push("");
  });

  out.push(`TOTAL: ${formatCOP(input.total)} COP`);
  if (input.lines.some((l) => l.madeToOrderQty > 0)) {
    out.push(`(Los productos bajo pedido tardan ${days} en fabricarse, sin contar el envío.)`);
  }
  if (input.customerName || input.customerCity) {
    out.push("");
    if (input.customerName) out.push(`Nombre: ${input.customerName}`);
    if (input.customerCity) out.push(`Ciudad: ${input.customerCity}`);
  }
  out.push("");
  out.push("Quedo pendiente de confirmar disponibilidad, envío y forma de pago. ¡Gracias!");
  return out.join("\n");
}

export function whatsappUrl(number: string, text: string) {
  return `https://wa.me/${normalizeWhatsappNumber(number)}?text=${encodeURIComponent(text)}`;
}

/* ─────────────────────────── Utilidades ─────────────────────────── */

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
