import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, getRelatedProducts, getSettings } from "@/lib/catalog";
import { availabilityOf } from "@/lib/commerce";
import { ProductView, type ProductViewData } from "@/components/store/product-view";
import { ProductGrid } from "@/components/store/product-card";
import { SectionHeading } from "@/components/store/section-heading";

export const revalidate = 300;

// Las páginas de producto se generan en la primera visita y quedan en caché;
// el panel las renueva al guardar cualquier cambio.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Producto no encontrado" };
  const description = (p.description || `${p.name} de Dosha Bags.`).slice(0, 160);
  return {
    title: p.name,
    description,
    alternates: { canonical: `/producto/${p.slug}` },
    openGraph: { title: p.name, description, images: p.images[0] ? [p.images[0].url] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const [settings, related] = await Promise.all([getSettings(), getRelatedProducts(product)]);

  const data: ProductViewData = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    reference: product.reference,
    collection: product.collection ? { name: product.collection.name, slug: product.collection.slug } : null,
    description: product.description,
    details: product.details,
    care: product.care,
    isNew: product.isNew,
    variants: product.variants.map((v) => ({
      id: v.id,
      colorName: v.color.name,
      colorHex: v.color.hex,
      price: v.priceOverride ?? product.price,
      status: v.status,
      stock: v.stock,
      allowMadeToOrder: v.allowMadeToOrder,
    })),
    images: product.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt || product.name, variantId: i.variantId })),
    personalization: {
      personalizationEnabled: product.personalizationEnabled,
      personalizationLabel: product.personalizationLabel,
      personalizationMaxChars: product.personalizationMaxChars,
      personalizationPrice: product.personalizationPrice,
      personalizationCharset: product.personalizationCharset,
      personalizationRequired: product.personalizationRequired,
      personalizationOptions: product.personalizationOptions,
    },
    personalizationNote: product.personalizationNote,
  };

  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.reference,
    description: product.description,
    brand: { "@type": "Brand", name: "Dosha Bags" },
    image: product.images.map((i) => (i.url.startsWith("http") ? i.url : site + i.url)),
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      priceCurrency: "COP",
      price: v.priceOverride ?? product.price,
      itemCondition: "https://schema.org/NewCondition",
      availability:
        availabilityOf(v) === "immediate"
          ? "https://schema.org/InStock"
          : availabilityOf(v) === "made_to_order"
            ? "https://schema.org/PreOrder"
            : "https://schema.org/OutOfStock",
      url: `${site}/producto/${product.slug}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Ruta" className="container-x pt-5 text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/tienda" className="hover:text-cranberry">
              Tienda
            </Link>
          </li>
          {product.collection && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/colecciones/${product.collection.slug}`} className="hover:text-cranberry">
                  {product.collection.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {product.name}
          </li>
        </ol>
      </nav>
      <ProductView
        product={data}
        info={{
          shipping: settings.shippingText,
          madeToOrder: settings.madeToOrderText,
          returns: settings.returnsText,
          mtoMin: settings.madeToOrderMinDays,
          mtoMax: settings.madeToOrderMaxDays,
        }}
      />
      {related.length > 0 && (
        <section className="container-x pt-20 md:pt-28">
          <SectionHeading eyebrow="También te puede gustar" title="Completa tu elección" href="/tienda" linkLabel="Ver tienda" />
          <div className="mt-10">
            <ProductGrid products={related} />
          </div>
        </section>
      )}
    </>
  );
}
