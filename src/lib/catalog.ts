import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { availabilityOf, type AvailabilityKind } from "./commerce";

export const getSettings = cache(async () => {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1)).limit(1);
  if (!row) throw new Error("La configuración no existe. Ejecuta npm run db:migrate.");
  return row;
});
export type Settings = Awaited<ReturnType<typeof getSettings>>;

async function loadVisibleProducts() {
  const rows = await db.query.products.findMany({
    where: eq(schema.products.isVisible, true),
    with: {
      collection: true,
      category: true,
      variants: { with: { color: true }, orderBy: [asc(schema.productVariants.sortOrder)] },
      images: { orderBy: [asc(schema.productImages.sortOrder)] },
    },
    orderBy: [asc(schema.products.sortOrder), asc(schema.products.name)],
  });
  // Una colección oculta oculta también sus productos.
  return rows.filter((p) => !p.collection || p.collection.isVisible);
}
export const getVisibleProducts = cache(loadVisibleProducts);
type FullProduct = Awaited<ReturnType<typeof loadVisibleProducts>>[number];

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  reference: string;
  price: number;
  priceFrom: boolean;
  collection: string | null;
  image: { url: string; alt: string } | null;
  hoverImage: { url: string; alt: string } | null;
  colors: { name: string; hex: string }[];
  availability: AvailabilityKind;
  isNew: boolean;
  personalizable: boolean;
};

function variantPrice(p: FullProduct, v: FullProduct["variants"][number]) {
  return v.priceOverride ?? p.price;
}

export function toCard(p: FullProduct): ProductCardData {
  const prices = p.variants.length ? p.variants.map((v) => variantPrice(p, v)) : [p.price];
  const kinds = p.variants.map(availabilityOf);
  const availability: AvailabilityKind = kinds.includes("immediate")
    ? "immediate"
    : kinds.includes("made_to_order")
      ? "made_to_order"
      : "unavailable";
  const [first, second] = p.images;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    reference: p.reference,
    price: Math.min(...prices),
    priceFrom: new Set(prices).size > 1,
    collection: p.collection?.name ?? null,
    image: first ? { url: first.url, alt: first.alt || p.name } : null,
    hoverImage: second ? { url: second.url, alt: second.alt || p.name } : null,
    colors: p.variants.map((v) => ({ name: v.color.name, hex: v.color.hex })),
    availability,
    isNew: p.isNew,
    personalizable: p.personalizationEnabled,
  };
}

export type CatalogFilters = {
  q?: string;
  coleccion?: string;
  categoria?: string;
  color?: string;
  min?: number;
  max?: number;
  disponibilidad?: "inmediata" | "encargo";
  orden?: "destacados" | "precio-asc" | "precio-desc" | "nombre";
  personalizable?: boolean;
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export async function getCatalog(f: CatalogFilters) {
  const all = await getVisibleProducts();
  const q = f.q ? norm(f.q.trim()) : "";
  const list = all.filter((p) => {
    if (q) {
      const hay = norm(
        [p.name, p.reference, p.description, p.collection?.name, p.category?.name, ...p.variants.map((v) => v.color.name)]
          .filter(Boolean)
          .join(" "),
      );
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    if (f.coleccion && p.collection?.slug !== f.coleccion) return false;
    if (f.categoria && p.category?.slug !== f.categoria) return false;
    if (f.color && !p.variants.some((v) => norm(v.color.name) === norm(f.color!))) return false;
    if (f.personalizable && !p.personalizationEnabled) return false;
    const prices = p.variants.length ? p.variants.map((v) => variantPrice(p, v)) : [p.price];
    if (f.min != null && Math.max(...prices) < f.min) return false;
    if (f.max != null && Math.min(...prices) > f.max) return false;
    if (f.disponibilidad === "inmediata" && !p.variants.some((v) => availabilityOf(v) === "immediate")) return false;
    if (f.disponibilidad === "encargo" && !p.variants.some((v) => availabilityOf(v) === "made_to_order")) return false;
    return true;
  });
  const cards = list.map(toCard);
  if (f.orden === "precio-asc") cards.sort((a, b) => a.price - b.price);
  if (f.orden === "precio-desc") cards.sort((a, b) => b.price - a.price);
  if (f.orden === "nombre") cards.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return cards;
}

export const getFacets = cache(async () => {
  const all = await getVisibleProducts();
  const [cols, cats] = await Promise.all([getVisibleCollections(), db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name))]);
  const usedCats = new Set(all.map((p) => p.categoryId));
  const colorMap = new Map<string, string>();
  for (const p of all) for (const v of p.variants) colorMap.set(v.color.name, v.color.hex);
  return {
    collections: cols.map((c) => ({ slug: c.slug, name: c.name })),
    categories: cats.filter((c) => usedCats.has(c.id)).map((c) => ({ slug: c.slug, name: c.name })),
    colors: [...colorMap].map(([name, hex]) => ({ name, hex })).sort((a, b) => a.name.localeCompare(b.name, "es")),
  };
});

export const getVisibleCollections = cache(async () =>
  db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.isVisible, true))
    .orderBy(asc(schema.collections.sortOrder), asc(schema.collections.name)),
);

export async function getCollectionBySlug(slug: string) {
  const cols = await getVisibleCollections();
  return cols.find((c) => c.slug === slug) ?? null;
}

export async function getFeaturedProducts(limit = 8) {
  const all = await getVisibleProducts();
  const featured = all.filter((p) => p.isFeatured);
  return (featured.length ? featured : all).slice(0, limit).map(toCard);
}

export async function getProductBySlug(slug: string) {
  const all = await getVisibleProducts();
  return all.find((p) => p.slug === slug) ?? null;
}
export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

export async function getRelatedProducts(p: ProductDetail, limit = 4) {
  const all = await getVisibleProducts();
  const same = all.filter((x) => x.id !== p.id && x.collectionId && x.collectionId === p.collectionId);
  const others = all.filter((x) => x.id !== p.id && !same.includes(x));
  return [...same, ...others].slice(0, limit).map(toCard);
}
