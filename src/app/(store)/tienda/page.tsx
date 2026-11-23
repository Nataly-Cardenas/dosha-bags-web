import type { Metadata } from "next";
import { getCatalog, getFacets } from "@/lib/catalog";
import { parseFilters, type SP } from "@/lib/filters";
import { ProductGrid } from "@/components/store/product-card";
import { CatalogFilters as Filters } from "@/components/store/catalog-filters";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Todos los bolsos y estuches de Dosha Bags. Filtra por colección, color, precio y disponibilidad.",
  alternates: { canonical: "/tienda" },
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const filters = parseFilters(await searchParams);
  const [products, facets] = await Promise.all([getCatalog(filters), getFacets()]);

  return (
    <div className="container-x pt-10 md:pt-14">
      <header className="border-b border-line pb-6">
        <p className="eyebrow text-taupe">Tienda</p>
        <h1 className="mt-3 text-5xl text-cranberry md:text-6xl">Todos los productos</h1>
      </header>
      <Filters facets={facets} filters={filters} total={products.length}>
        {products.length ? (
          <ProductGrid products={products} priorityCount={4} />
        ) : (
          <div className="border border-dashed border-line px-6 py-16 text-center">
            <p className="font-serif text-2xl">No encontramos productos con esos filtros.</p>
            <p className="mt-2 text-sm text-muted">Prueba con otra búsqueda o limpia los filtros.</p>
          </div>
        )}
      </Filters>
    </div>
  );
}
