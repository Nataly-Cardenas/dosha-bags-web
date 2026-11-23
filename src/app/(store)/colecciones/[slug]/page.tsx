import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getCatalog, getCollectionBySlug, getFacets } from "@/lib/catalog";
import { parseFilters, type SP } from "@/lib/filters";
import { ProductGrid } from "@/components/store/product-card";
import { CatalogFilters } from "@/components/store/catalog-filters";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCollectionBySlug((await params).slug);
  if (!c) return { title: "Colección no encontrada" };
  return {
    title: c.name,
    description: c.description || `Colección ${c.name} de Dosha Bags.`,
    alternates: { canonical: `/colecciones/${c.slug}` },
    openGraph: c.imageUrl ? { images: [c.imageUrl] } : undefined,
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();
  const filters = { ...parseFilters(await searchParams), coleccion: slug };
  const [products, facets] = await Promise.all([getCatalog(filters), getFacets()]);

  return (
    <>
      <section className="relative bg-sand">
        <div className="grid md:grid-cols-2">
          <div className="container-x flex flex-col justify-end py-12 md:py-20 md:pl-10">
            <p className="eyebrow text-taupe">Colección</p>
            <h1 className="mt-3 text-5xl text-cranberry md:text-7xl">{collection.name}</h1>
            {collection.description && <p className="mt-5 max-w-md text-muted">{collection.description}</p>}
          </div>
          {collection.imageUrl && (
            <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[46vh]">
              <Image src={collection.imageUrl} alt={collection.name} fill priority sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
            </div>
          )}
        </div>
      </section>
      <div className="container-x">
        <CatalogFilters facets={facets} filters={filters} total={products.length} hideCollection>
          {products.length ? (
            <ProductGrid products={products} priorityCount={4} />
          ) : (
            <p className="border border-dashed border-line px-6 py-16 text-center text-muted">
              No hay productos que coincidan en esta colección.
            </p>
          )}
        </CatalogFilters>
      </div>
    </>
  );
}
