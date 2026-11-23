import Link from "next/link";
import Image from "next/image";
import { getFeaturedProducts, getSettings, getVisibleCollections } from "@/lib/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { PhotoPlaceholder } from "@/components/store/photo-placeholder";
import { IconArrow, IconChat, IconLetter, IconNeedle } from "@/components/icons";
import { Paragraphs } from "@/components/store/paragraphs";
import { SectionHeading } from "@/components/store/section-heading";

export const revalidate = 300;

export default async function HomePage() {
  const [settings, collections, featured] = await Promise.all([
    getSettings(),
    getVisibleCollections(),
    getFeaturedProducts(8),
  ]);
  const featuredCollections = (collections.some((c) => c.isFeatured) ? collections.filter((c) => c.isFeatured) : collections).slice(0, 3);

  return (
    <>
      {/* Portada */}
      <section className="relative">
        <div className="grid md:grid-cols-[1fr_1.15fr]">
          <div className="order-2 flex flex-col justify-center px-5 py-14 md:order-1 md:px-12 md:py-20 lg:px-20">
            {settings.heroEyebrow && <p className="eyebrow text-taupe">{settings.heroEyebrow}</p>}
            <h1 className="mt-4 max-w-xl text-5xl text-cranberry md:text-6xl lg:text-7xl">{settings.heroTitle}</h1>
            {settings.heroSubtitle && <p className="mt-6 max-w-md text-base text-muted">{settings.heroSubtitle}</p>}
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/tienda" className="btn btn-primary">
                {settings.heroCtaLabel || "Ver la colección"} <IconArrow size={16} />
              </Link>
              {collections[0] && (
                <Link href="/colecciones" className="btn btn-outline">
                  Colecciones
                </Link>
              )}
            </div>
          </div>
          <div className="relative order-1 aspect-[4/5] bg-sand md:order-2 md:aspect-auto md:min-h-[78vh]">
            {settings.heroImageUrl ? (
              <Image
                src={settings.heroImageUrl}
                alt={settings.heroTitle}
                fill
                priority
                sizes="(min-width: 768px) 55vw, 100vw"
                className="object-cover"
              />
            ) : (
              <PhotoPlaceholder label="Imagen de portada · se cambia desde el panel" />
            )}
          </div>
        </div>
      </section>

      {/* Propuesta de valor */}
      <section aria-label="Lo que nos distingue" className="border-y border-line bg-beige/60">
        <ul className="container-x grid gap-6 py-8 text-sm md:grid-cols-3 md:gap-10">
          <Value icon={<IconNeedle size={22} />} title="Fabricación por encargo">
            ¿No está tu color? Lo hacemos en {settings.madeToOrderMinDays} a {settings.madeToOrderMaxDays} días hábiles.
          </Value>
          <Value icon={<IconLetter size={22} />} title="Personalización">
            Añade iniciales o un nombre en los modelos que lo permiten.
          </Value>
          <Value icon={<IconChat size={22} />} title="Pide por WhatsApp">
            Arma tu carrito y confirma disponibilidad, envío y pago con nosotras.
          </Value>
        </ul>
      </section>

      {/* Colecciones */}
      {featuredCollections.length > 0 && (
        <section className="container-x pt-20 md:pt-28">
          <SectionHeading eyebrow="Colecciones" title="Explora por colección" href="/colecciones" linkLabel="Ver todas" />
          <div className={`mt-10 grid gap-4 md:gap-6 ${featuredCollections.length > 1 ? "md:grid-cols-2 lg:grid-cols-3" : ""}`}>
            {featuredCollections.map((c, i) => (
              <Link
                key={c.id}
                href={`/colecciones/${c.slug}`}
                className={`group relative block overflow-hidden bg-sand ${i === 0 && featuredCollections.length === 3 ? "lg:row-span-1" : ""}`}
              >
                <div className="relative aspect-[4/5]">
                  {c.imageUrl ? (
                    <Image
                      src={c.imageUrl}
                      alt={c.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                  ) : (
                    <PhotoPlaceholder label="" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/55 to-transparent p-6 pt-24 text-ivory">
                    <h3 className="text-4xl">{c.name}</h3>
                    <span className="eyebrow mt-2 inline-flex items-center gap-2">
                      Descubrir <IconArrow size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Productos destacados */}
      <section className="container-x pt-20 md:pt-28">
        <SectionHeading eyebrow="Favoritos" title="Piezas para el día a día" href="/tienda" linkLabel="Ver toda la tienda" />
        <div className="mt-10">
          {featured.length ? (
            <ProductGrid products={featured} />
          ) : (
            <p className="border border-dashed border-line p-10 text-center text-muted">
              Muy pronto encontrarás aquí nuestros bolsos.
            </p>
          )}
        </div>
      </section>

      {/* Editorial */}
      <section className="mt-20 bg-ivory md:mt-28">
        <div className="container-x grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24">
          <div className="relative aspect-[4/5] bg-sand md:aspect-[5/6]">
            {settings.editorialImageUrl ? (
              <Image src={settings.editorialImageUrl} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            ) : (
              <PhotoPlaceholder label="" />
            )}
          </div>
          <div className="max-w-lg">
            <p className="eyebrow text-taupe">Dosha Bags</p>
            <h2 className="mt-4 text-4xl text-cranberry md:text-5xl">{settings.editorialTitle}</h2>
            <div className="prose-dosha mt-6 text-muted">
              <Paragraphs text={settings.editorialBody} />
            </div>
            <Link href="/nosotros" className="eyebrow link-underline mt-8 inline-flex items-center gap-2 pb-1 text-cranberry">
              Conoce la marca <IconArrow size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Cómo comprar */}
      <section className="container-x pt-20 md:pt-28">
        <h2 className="text-center text-4xl text-cranberry md:text-5xl">Comprar es sencillo</h2>
        <ol className="mx-auto mt-12 grid max-w-5xl gap-10 md:grid-cols-3">
          {[
            ["Elige", "Escoge tu bolso, el color y, si quieres, tus iniciales."],
            ["Envía", "Revisa tu carrito y envíanos el pedido por WhatsApp."],
            ["Confirma", "Te confirmamos disponibilidad, envío y forma de pago."],
          ].map(([t, d], i) => (
            <li key={t} className="text-center">
              <span className="font-serif text-5xl italic text-taupe">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-sans text-sm font-medium uppercase tracking-[0.16em]">{t}</h3>
              <p className="mx-auto mt-2 max-w-[16rem] text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function Value({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-4">
      <span className="mt-0.5 text-taupe">{icon}</span>
      <span>
        <span className="block font-medium text-cranberry">{title}</span>
        <span className="text-muted">{children}</span>
      </span>
    </li>
  );
}
