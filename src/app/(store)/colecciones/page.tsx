import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getVisibleCollections, getVisibleProducts } from "@/lib/catalog";
import { PhotoPlaceholder } from "@/components/store/photo-placeholder";
import { IconArrow } from "@/components/icons";

export const revalidate = 300;
export const metadata: Metadata = { title: "Colecciones", alternates: { canonical: "/colecciones" } };

export default async function CollectionsPage() {
  const [collections, products] = await Promise.all([getVisibleCollections(), getVisibleProducts()]);
  return (
    <div className="container-x pt-10 md:pt-14">
      <header className="border-b border-line pb-6">
        <p className="eyebrow text-taupe">Colecciones</p>
        <h1 className="mt-3 text-5xl text-cranberry md:text-6xl">Nuestras colecciones</h1>
      </header>
      {collections.length === 0 ? (
        <p className="py-16 text-center text-muted">Pronto publicaremos nuestras colecciones.</p>
      ) : (
        <div className="mt-10 space-y-16 md:space-y-24">
          {collections.map((c, i) => {
            const count = products.filter((p) => p.collectionId === c.id).length;
            return (
              <Link
                key={c.id}
                href={`/colecciones/${c.slug}`}
                className="group grid items-center gap-6 md:grid-cols-2 md:gap-16"
              >
                <div className={`relative aspect-[4/3] overflow-hidden bg-sand ${i % 2 ? "md:order-2" : ""}`}>
                  {c.imageUrl ? (
                    <Image
                      src={c.imageUrl}
                      alt={c.name}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      priority={i === 0}
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <PhotoPlaceholder label="" />
                  )}
                </div>
                <div className="max-w-md">
                  <p className="eyebrow text-taupe">
                    {count} {count === 1 ? "pieza" : "piezas"}
                  </p>
                  <h2 className="mt-3 text-5xl text-cranberry">{c.name}</h2>
                  {c.description && <p className="mt-4 text-muted">{c.description}</p>}
                  <span className="eyebrow link-underline mt-6 inline-flex items-center gap-2 pb-1">
                    Ver colección <IconArrow size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
