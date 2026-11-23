import type { CatalogFilters } from "./catalog";

export type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const num = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export function parseFilters(sp: SP): CatalogFilters {
  const disp = one(sp.disponibilidad);
  const orden = one(sp.orden);
  return {
    q: one(sp.q)?.slice(0, 80),
    coleccion: one(sp.coleccion),
    categoria: one(sp.categoria),
    color: one(sp.color),
    min: num(one(sp.min)),
    max: num(one(sp.max)),
    disponibilidad: disp === "inmediata" || disp === "encargo" ? disp : undefined,
    orden: (["precio-asc", "precio-desc", "nombre"] as const).find((o) => o === orden) ?? "destacados",
    personalizable: one(sp.personalizable) === "1",
  };
}

