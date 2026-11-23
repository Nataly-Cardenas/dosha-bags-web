"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  availabilityOf,
  charsetHint,
  formatCOP,
  splitQuantity,
  validatePersonalization,
  type PersonalizationConfig,
  type VariantStatus,
} from "@/lib/commerce";
import { IconCheck, IconChevron, IconMinus, IconPlus, IconTruck, IconNeedle } from "@/components/icons";
import { useCart } from "./cart-context";
import { PhotoPlaceholder } from "./photo-placeholder";
import { Paragraphs } from "./paragraphs";

export type ProductViewData = {
  id: string;
  slug: string;
  name: string;
  reference: string;
  collection: { name: string; slug: string } | null;
  description: string;
  details: string;
  care: string;
  isNew: boolean;
  variants: {
    id: string;
    colorName: string;
    colorHex: string;
    price: number;
    status: VariantStatus;
    stock: number;
    allowMadeToOrder: boolean;
  }[];
  images: { id: string; url: string; alt: string; variantId: string | null }[];
  personalization: PersonalizationConfig;
  personalizationNote: string;
};

type Info = { shipping: string; madeToOrder: string; returns: string; mtoMin: number; mtoMax: number };

export function ProductView({ product, info }: { product: ProductViewData; info: Info }) {
  const { add } = useCart();
  const firstAvailable =
    product.variants.find((v) => availabilityOf(v) === "immediate") ??
    product.variants.find((v) => availabilityOf(v) !== "unavailable") ??
    product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id ?? "");
  const [qty, setQty] = useState(1);
  const [wantsPersonalization, setWantsPersonalization] = useState(product.personalization.personalizationRequired);
  const [text, setText] = useState("");
  const [options, setOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.personalization.personalizationOptions.map((o) => [o.label, o.choices[0]?.name ?? ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId);
  const kind = variant ? availabilityOf(variant) : "unavailable";
  const split = variant ? splitQuantity(variant, qty) : null;
  const days = `${info.mtoMin} a ${info.mtoMax} días hábiles`;
  const pc = product.personalization;

  const pers = useMemo(
    () => validatePersonalization(pc, wantsPersonalization ? { text, options } : null),
    [pc, wantsPersonalization, text, options],
  );
  const extra = pers.ok ? pers.extra : 0;
  const unitPrice = (variant?.price ?? 0) + extra;

  // Fotos: primero las del color elegido, luego las generales.
  const gallery = useMemo(() => {
    const own = product.images.filter((i) => i.variantId === variantId);
    const general = product.images.filter((i) => !i.variantId);
    const list = own.length ? [...own, ...general] : general.length ? general : product.images;
    return list;
  }, [product.images, variantId]);

  useEffect(() => setAdded(false), [variantId, qty, text, options]);

  const onAdd = () => {
    setError(null);
    if (!variant || kind === "unavailable") return;
    if (!pers.ok) {
      setError(pers.error);
      return;
    }
    if (split && !split.ok) {
      setError(`Solo hay ${variant.stock} unidad(es) disponibles en este color.`);
      return;
    }
    add({
      productId: product.id,
      variantId: variant.id,
      quantity: qty,
      personalization: pers.value ? { text: pers.value.text, options } : null,
    });
    setAdded(true);
  };

  const maxQty = variant && kind === "immediate" && !variant.allowMadeToOrder ? Math.max(1, variant.stock) : 20;
  const ctaLabel =
    kind === "unavailable"
      ? "No disponible por ahora"
      : split && split.madeToOrderQty > 0 && split.immediateQty === 0
        ? "Encargar este bolso"
        : "Agregar al carrito";

  return (
    <div className="container-x grid gap-8 pt-5 md:grid-cols-[1.15fr_1fr] md:gap-12 lg:gap-20">
      <Gallery images={gallery} name={product.name} key={variantId} />

      <div className="md:sticky md:top-28 md:self-start md:pt-4">
        {product.isNew && <p className="eyebrow text-taupe">Nuevo</p>}
        <h1 className="mt-2 text-4xl text-cranberry md:text-5xl">{product.name}</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted">Ref. {product.reference}</p>
        <p className="mt-5 text-2xl" aria-live="polite">
          {formatCOP(unitPrice)} <span className="text-sm text-muted">COP</span>
        </p>
        {extra > 0 && <p className="text-xs text-muted">Incluye personalización (+{formatCOP(extra)})</p>}

        {/* Colores */}
        {product.variants.length > 0 && (
          <fieldset className="mt-8">
            <legend className="eyebrow text-muted">
              Color: <span className="text-ink">{variant?.colorName}</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-3" role="radiogroup" aria-label="Color">
              {product.variants.map((v) => {
                const k = availabilityOf(v);
                const selected = v.id === variantId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${v.colorName}${k === "unavailable" ? " (no disponible)" : k === "made_to_order" ? " (bajo pedido)" : ""}`}
                    title={v.colorName}
                    onClick={() => {
                      setVariantId(v.id);
                      setQty(1);
                    }}
                    className={`relative h-10 w-10 rounded-full p-[3px] transition-shadow ${selected ? "ring-1 ring-cranberry" : "ring-1 ring-transparent hover:ring-line"}`}
                  >
                    <span className="block h-full w-full rounded-full ring-1 ring-ink/15" style={{ background: v.colorHex }} />
                    {k === "unavailable" && (
                      <span className="absolute left-1/2 top-1/2 h-px w-9 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-ink/60" />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Disponibilidad */}
        <div className="mt-5 flex items-start gap-2.5 text-sm" aria-live="polite">
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${kind === "immediate" ? "bg-success" : kind === "made_to_order" ? "bg-taupe" : "bg-danger"}`}
          />
          <div>
            {kind === "immediate" && (
              <p>
                <strong className="font-medium">Disponible para entrega inmediata.</strong>
                {split && split.madeToOrderQty > 0 && (
                  <span className="block text-muted">
                    Hay {variant?.stock} en inventario; {split.madeToOrderQty} se fabricarían bajo pedido ({days}).
                  </span>
                )}
              </p>
            )}
            {kind === "made_to_order" && (
              <p>
                <strong className="font-medium">Disponible bajo pedido.</strong>{" "}
                <span className="text-muted">
                  Lo fabricamos para ti en {days}. Este plazo no incluye el tiempo de envío.
                </span>
              </p>
            )}
            {kind === "unavailable" && (
              <p>
                <strong className="font-medium">Temporalmente no disponible en este color.</strong>{" "}
                <span className="text-muted">Prueba con otro color o escríbenos por WhatsApp.</span>
              </p>
            )}
          </div>
        </div>

        {/* Personalización */}
        {pc.personalizationEnabled && kind !== "unavailable" && (
          <div className="mt-8 border border-line bg-ivory/60 p-5">
            {!pc.personalizationRequired && (
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-cranberry"
                  checked={wantsPersonalization}
                  onChange={(e) => setWantsPersonalization(e.target.checked)}
                />
                <span className="text-sm font-medium">
                  Personalizar
                  {pc.personalizationPrice > 0 && (
                    <span className="font-normal text-muted"> (+{formatCOP(pc.personalizationPrice)})</span>
                  )}
                </span>
              </label>
            )}
            {wantsPersonalization && (
              <div className={pc.personalizationRequired ? "" : "mt-5"}>
                <label className="label" htmlFor="pers-text">
                  {pc.personalizationLabel}
                </label>
                <input
                  id="pers-text"
                  className="field font-serif text-lg tracking-wide"
                  value={text}
                  maxLength={pc.personalizationMaxChars}
                  onChange={(e) => setText(e.target.value)}
                  aria-invalid={!pers.ok && text.length > 0}
                  aria-describedby="pers-help"
                  autoComplete="off"
                  autoCapitalize="characters"
                />
                <p id="pers-help" className="mt-1.5 flex justify-between gap-3 text-xs text-muted">
                  <span>
                    Máximo {pc.personalizationMaxChars} caracteres · {charsetHint(pc.personalizationCharset)}
                  </span>
                  <span>
                    {text.length}/{pc.personalizationMaxChars}
                  </span>
                </p>

                {pc.personalizationOptions.map((o) => (
                  <fieldset key={o.label} className="mt-4">
                    <legend className="label">{o.label}</legend>
                    <div className="flex flex-wrap gap-2">
                      {o.choices.map((c) => {
                        const sel = options[o.label] === c.name;
                        return (
                          <button
                            key={c.name}
                            type="button"
                            aria-pressed={sel}
                            onClick={() => setOptions((s) => ({ ...s, [o.label]: c.name }))}
                            className={`flex items-center gap-2 border px-3 py-2 text-xs ${sel ? "border-cranberry bg-cranberry text-ivory" : "border-line bg-white hover:border-taupe"}`}
                          >
                            {c.hex && <span className="h-3 w-3 rounded-full ring-1 ring-ink/20" style={{ background: c.hex }} />}
                            {c.name}
                            {c.price > 0 && <span className="opacity-75">+{formatCOP(c.price)}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}

                {text.trim() && pers.ok && pers.value && (
                  <div className="mt-5">
                    <p className="label">Vista previa ilustrativa</p>
                    <div className="flex items-center justify-center border border-line bg-sand px-4 py-6">
                      <span
                        className="font-serif text-3xl tracking-[0.2em]"
                        style={{
                          color:
                            pc.personalizationOptions
                              .flatMap((o) => o.choices.filter((c) => options[o.label] === c.name && c.hex))
                              .map((c) => c.hex)[0] ?? "#3f1116",
                        }}
                      >
                        {pers.value.text}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted">
                      Referencia visual: el resultado final depende del material y la técnica.
                    </p>
                  </div>
                )}
                {product.personalizationNote && <p className="mt-3 text-xs text-muted">{product.personalizationNote}</p>}
              </div>
            )}
          </div>
        )}

        {/* Cantidad + agregar */}
        <div className="mt-8 flex gap-3">
          <QuantityStepper value={qty} max={maxQty} onChange={setQty} disabled={kind === "unavailable"} />
          <button type="button" className="btn btn-primary flex-1" disabled={kind === "unavailable"} onClick={onAdd}>
            {ctaLabel}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        {added && (
          <div role="status" className="mt-3 flex items-center justify-between gap-3 border border-success/30 bg-success/5 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-success">
              <IconCheck size={18} /> Agregado al carrito
            </span>
            <Link href="/carrito" className="eyebrow link-underline pb-0.5 text-cranberry">
              Ver carrito
            </Link>
          </div>
        )}

        <ul className="mt-8 grid grid-cols-2 border-y border-line text-xs text-muted">
          <li className="flex items-center gap-2 border-r border-line py-4 pr-3">
            <IconTruck size={20} className="shrink-0 text-taupe" /> Envío y pago coordinados por WhatsApp
          </li>
          <li className="flex items-center gap-2 py-4 pl-4">
            <IconNeedle size={20} className="shrink-0 text-taupe" /> Fabricación bajo pedido en {info.mtoMin}–{info.mtoMax} días hábiles
          </li>
        </ul>

        <div className="mt-2">
          {product.description && <Accordion title="Descripción" open><Paragraphs text={product.description} /></Accordion>}
          {product.details && <Accordion title="Materiales y medidas"><Paragraphs text={product.details} /></Accordion>}
          {product.care && <Accordion title="Cuidados"><Paragraphs text={product.care} /></Accordion>}
          {info.shipping && <Accordion title="Envíos"><Paragraphs text={info.shipping} /></Accordion>}
          {info.madeToOrder && <Accordion title="Fabricación bajo pedido"><Paragraphs text={info.madeToOrder} /></Accordion>}
          {info.returns && <Accordion title="Cambios y devoluciones"><Paragraphs text={info.returns} /></Accordion>}
        </div>
      </div>
    </div>
  );
}

function Accordion({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-b border-line" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-xs font-medium uppercase tracking-[0.14em] [&::-webkit-details-marker]:hidden">
        {title}
        <IconPlus size={16} className="transition-transform duration-300 group-open:rotate-45" />
      </summary>
      <div className="prose-dosha pb-5 text-sm text-muted">{children}</div>
    </details>
  );
}

export function QuantityStepper({
  value,
  onChange,
  max = 20,
  disabled,
  small,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  disabled?: boolean;
  small?: boolean;
}) {
  const h = small ? "h-10" : "h-12";
  return (
    <div className={`flex ${h} items-stretch border border-line bg-white`} role="group" aria-label="Cantidad">
      <button
        type="button"
        className="px-3 disabled:opacity-30"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        aria-label="Disminuir cantidad"
      >
        <IconMinus size={15} />
      </button>
      <span className="flex w-8 items-center justify-center text-sm tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="px-3 disabled:opacity-30"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Aumentar cantidad"
      >
        <IconPlus size={15} />
      </button>
    </div>
  );
}

function Gallery({ images, name }: { images: { id: string; url: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  if (!images.length) {
    return (
      <div className="relative aspect-[4/5] bg-sand">
        <PhotoPlaceholder />
      </div>
    );
  }

  const go = (i: number) => {
    const n = (i + images.length) % images.length;
    setActive(n);
    const el = scroller.current;
    if (el && el.offsetParent !== null) el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="-mx-5 md:mx-0">
      {/* Móvil: deslizar */}
      <div className="relative md:hidden">
        <div
          ref={scroller}
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            setActive(Math.round(el.scrollLeft / el.clientWidth));
          }}
          aria-label={`Fotografías de ${name}`}
        >
          {images.map((img, i) => (
            <div key={img.id} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-sand">
              <Image src={img.url} alt={img.alt} fill priority={i === 0} sizes="100vw" className="object-cover" />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                aria-label={`Ver foto ${i + 1}`}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-cranberry" : "w-1.5 bg-cranberry/30"}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Escritorio: miniaturas + principal */}
      <div className="hidden gap-4 md:grid md:grid-cols-[72px_1fr]">
        <div className="flex flex-col gap-3">
          {images.length > 1 &&
            images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === active}
                className={`relative aspect-[4/5] bg-sand ring-offset-2 ring-offset-paper ${i === active ? "ring-1 ring-cranberry" : "opacity-70 hover:opacity-100"}`}
              >
                <Image src={img.url} alt="" fill sizes="72px" className="object-cover" />
              </button>
            ))}
        </div>
        <div className="group relative aspect-[4/5] bg-sand">
          <Image
            src={images[active]?.url ?? images[0].url}
            alt={images[active]?.alt ?? name}
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 55vw"
            className="object-cover"
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Foto anterior"
                onClick={() => go(active - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rotate-180 bg-paper/80 p-2 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <IconChevron size={18} />
              </button>
              <button
                type="button"
                aria-label="Foto siguiente"
                onClick={() => go(active + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-paper/80 p-2 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <IconChevron size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
