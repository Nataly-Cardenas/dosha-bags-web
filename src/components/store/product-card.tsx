import Link from "next/link";
import Image from "next/image";
import { formatCOP } from "@/lib/commerce";
import type { ProductCardData } from "@/lib/catalog";
import { PhotoPlaceholder } from "./photo-placeholder";

export function ProductCard({ p, priority = false }: { p: ProductCardData; priority?: boolean }) {
  const tag =
    p.availability === "unavailable"
      ? "Agotado"
      : p.isNew
        ? "Nuevo"
        : p.availability === "made_to_order"
          ? "Bajo pedido"
          : null;
  return (
    <article className="group">
      <Link href={`/producto/${p.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-sand">
          {p.image ? (
            <>
              <Image
                src={p.image.url}
                alt={p.image.alt}
                fill
                priority={priority}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className={`object-cover transition-opacity duration-500 ${p.hoverImage ? "md:group-hover:opacity-0" : ""}`}
              />
              {p.hoverImage && (
                <Image
                  src={p.hoverImage.url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 33vw"
                  className="hidden object-cover opacity-0 transition-opacity duration-500 md:block md:group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <PhotoPlaceholder />
          )}
          {tag && (
            <span className="eyebrow absolute left-3 top-3 bg-paper/90 px-2 py-1 text-[0.6rem] text-cranberry">{tag}</span>
          )}
        </div>
        <div className="pt-3.5">
          {p.collection && <p className="eyebrow text-[0.6rem] text-muted">{p.collection}</p>}
          <h3 className="mt-1 font-serif text-xl leading-tight md:text-[1.35rem]">{p.name}</h3>
          <p className="mt-1 text-sm">
            {p.priceFrom && <span className="text-muted">Desde </span>}
            {formatCOP(p.price)}
          </p>
        </div>
      </Link>
      {p.colors.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label={`Colores: ${p.colors.map((c) => c.name).join(", ")}`}>
          {p.colors.slice(0, 6).map((c) => (
            <li
              key={c.name}
              title={c.name}
              className="h-3 w-3 rounded-full ring-1 ring-ink/15 ring-offset-1 ring-offset-paper"
              style={{ background: c.hex }}
            />
          ))}
          {p.colors.length > 6 && <li className="text-[0.65rem] text-muted">+{p.colors.length - 6}</li>}
        </ul>
      )}
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-14 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} p={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
