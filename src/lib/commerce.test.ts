import { describe, it, expect } from "vitest";
import {
  availabilityOf,
  splitQuantity,
  validatePersonalization,
  buildWhatsAppMessage,
  whatsappUrl,
  normalizeWhatsappNumber,
  formatCOP,
  slugify,
  type PersonalizationConfig,
} from "./commerce";

describe("disponibilidad", () => {
  it("entrega inmediata con inventario", () => {
    expect(availabilityOf({ status: "in_stock", stock: 2, allowMadeToOrder: true })).toBe("immediate");
  });
  it("sin inventario pasa a bajo pedido si se permite", () => {
    expect(availabilityOf({ status: "in_stock", stock: 0, allowMadeToOrder: true })).toBe("made_to_order");
    expect(availabilityOf({ status: "in_stock", stock: 0, allowMadeToOrder: false })).toBe("unavailable");
  });
  it("respeta los estados manuales", () => {
    expect(availabilityOf({ status: "unavailable", stock: 9, allowMadeToOrder: true })).toBe("unavailable");
    expect(availabilityOf({ status: "made_to_order", stock: 9, allowMadeToOrder: false })).toBe("made_to_order");
  });
  it("reparte cantidades entre inventario y encargo", () => {
    expect(splitQuantity({ status: "in_stock", stock: 1, allowMadeToOrder: true }, 3)).toEqual({
      ok: true,
      immediateQty: 1,
      madeToOrderQty: 2,
    });
    const r = splitQuantity({ status: "in_stock", stock: 1, allowMadeToOrder: false }, 3);
    expect(r.ok).toBe(false);
  });
});

const cfg: PersonalizationConfig = {
  personalizationEnabled: true,
  personalizationLabel: "Iniciales",
  personalizationMaxChars: 3,
  personalizationPrice: 15000,
  personalizationCharset: "letters",
  personalizationRequired: false,
  personalizationOptions: [
    { label: "Color del grabado", choices: [{ name: "Dorado", price: 0 }, { name: "Plateado", price: 5000 }] },
  ],
};

describe("personalización", () => {
  it("valida longitud y caracteres", () => {
    expect(validatePersonalization(cfg, { text: "ABCD" }).ok).toBe(false);
    expect(validatePersonalization(cfg, { text: "A1" }).ok).toBe(false);
    expect(validatePersonalization(cfg, { text: "<b>" }).ok).toBe(false);
  });
  it("calcula el costo adicional con opciones", () => {
    const r = validatePersonalization(cfg, { text: " ñ  a ", options: { "Color del grabado": "Plateado" } });
    expect(r.ok && r.value?.text).toBe("ñ a");
    expect(r.ok && r.extra).toBe(20000);
  });
  it("rechaza opciones manipuladas", () => {
    expect(validatePersonalization(cfg, { text: "AB", options: { "Color del grabado": "Oro 24k" } }).ok).toBe(false);
  });
  it("vacío es válido si no es obligatoria", () => {
    expect(validatePersonalization(cfg, { text: "" })).toEqual({ ok: true, value: null, extra: 0 });
    expect(validatePersonalization({ ...cfg, personalizationRequired: true }, { text: "" }).ok).toBe(false);
  });
  it("no se acepta en productos no personalizables", () => {
    expect(validatePersonalization({ ...cfg, personalizationEnabled: false }, { text: "AB" }).ok).toBe(false);
  });
});

describe("WhatsApp", () => {
  it("normaliza números colombianos", () => {
    expect(normalizeWhatsappNumber("300 123 4567")).toBe("573001234567");
    expect(normalizeWhatsappNumber("+57 300-123-4567")).toBe("573001234567");
  });
  it("formatea pesos", () => {
    expect(formatCOP(459000)).toBe("$459.000");
  });
  it("genera el mensaje y lo codifica", () => {
    const text = buildWhatsAppMessage({
      storeName: "Dosha Bags",
      code: "DB-0001",
      total: 349000,
      mtoMinDays: 3,
      mtoMaxDays: 5,
      lines: [
        {
          name: "Bolso Luna",
          reference: "DB-01",
          color: "Vino",
          quantity: 1,
          unitPrice: 199000,
          subtotal: 199000,
          personalization: '"AC" (Color del grabado: Dorado)',
          immediateQty: 1,
          madeToOrderQty: 0,
        },
        {
          name: "Estuche Sol",
          reference: "DB-02",
          color: "Taupe",
          quantity: 2,
          unitPrice: 75000,
          subtotal: 150000,
          personalization: null,
          immediateQty: 0,
          madeToOrderQty: 2,
        },
      ],
    });
    expect(text).toContain("1. Bolso Luna (Ref. DB-01)");
    expect(text).toContain("Disponibilidad: Fabricación bajo pedido (3-5 días hábiles)");
    expect(text).toContain("TOTAL: $349.000 COP");
    expect(text).toContain("Personalización: Ninguna");
    expect(text).toContain("no incluyen el tiempo de envío");
    const url = whatsappUrl("3001234567", text);
    expect(url.startsWith("https://wa.me/573001234567?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe(text);
    expect(url).not.toMatch(/[\s\n#&]text/);
  });
  it("usa el plazo propio del producto cuando existe", () => {
    const text = buildWhatsAppMessage({
      storeName: "Dosha Bags",
      total: 65000,
      mtoMinDays: 3,
      mtoMaxDays: 5,
      lines: [
        { name: "Bolso Siena", reference: "SIENA", color: "Negro", quantity: 1, unitPrice: 65000, subtotal: 65000,
          personalization: null, immediateQty: 0, madeToOrderQty: 1, mtoMinDays: 5, mtoMaxDays: 8 },
      ],
    });
    expect(text).toContain("Fabricación bajo pedido (5-8 días hábiles)");
  });
  it("slug sin tildes", () => {
    expect(slugify("Bolso Élodie Ñandú")).toBe("bolso-elodie-nandu");
  });
});
