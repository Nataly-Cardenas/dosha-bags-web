import type { MetadataRoute } from "next";
import { getVisibleCollections, getVisibleProducts } from "@/lib/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const [products, collections] = await Promise.all([getVisibleProducts(), getVisibleCollections()]);
  return [
    ...["", "/tienda", "/colecciones", "/nosotros", "/informacion"].map((p) => ({ url: base + p })),
    ...collections.map((c) => ({ url: `${base}/colecciones/${c.slug}` })),
    ...products.map((p) => ({ url: `${base}/producto/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
