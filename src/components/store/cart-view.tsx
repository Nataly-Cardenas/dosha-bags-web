"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { checkoutAction, quoteCartAction } from "@/app/actions/cart";
import type { Quote } from "@/lib/cart-types";
import { formatCOP } from "@/lib/commerce";
import { IconChat, IconCheck, IconNeedle, IconTrash } from "@/components/icons";
import { useCart } from "./cart-context";
import { QuantityStepper } from "./product-view";

export function CartView() {
  const { items, ready, setQuantity, remove, clear } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ code: string; url: string } | null>(null);
  const reqId = useRef(0);

  // El servidor recalcula precios y disponibilidad cada vez que cambia el carrito.
  useEffect(() => {
    if (!ready) return;
    if (!items.length) {
      setQuote(null);
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await quoteCartAction(items).catch(() => ({ ok: false as const, error: "Sin conexión." }));
      if (id !== reqId.current) return;
      if (res.ok) {
        setQuote(res.quote);
        setError(null);
      } else setError(res.error);
      setLoading(false);
    }, 150);
    return () => clearTimeout(t);
  }, [items, ready]);

  const checkout = async () => {
    setSending(true);
    setError(null);
    // Abrimos la ventana antes de esperar al servidor para que el navegador no la bloquee.
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const win = isMobile ? null : window.open("", "_blank");
    const res = await checkoutAction({ items, customerName: name, customerCity: city }).catch(() => ({
      ok: false as const,
      error: "Sin conexión. Inténtalo de nuevo.",
    }));
    setSending(false);
    if (!res.ok) {
      win?.close();
      setError(res.error);
      return;
    }
    setSent({ code: res.code, url: res.url });
    if (win) win.location.href = res.url;
    else window.location.href = res.url;
  };

  if (!ready || (loading && !quote && items.length > 0)) {
    return (
      <div className="grid gap-10 py-10 lg:grid-cols-[1fr_380px]" aria-busy="true">
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-32 w-24 animate-pulse bg-sand" />
              <div className="flex-1 space-y-3 pt-2">
                <div className="h-5 w-1/2 animate-pulse bg-sand" />
                <div className="h-4 w-1/3 animate-pulse bg-sand" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-64 animate-pulse bg-sand" />
      </div>
    );
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cranberry text-ivory">
          <IconCheck size={26} />
        </span>
        <h2 className="mt-6 text-4xl text-cranberry">Tu pedido está listo para enviar</h2>
        <p className="mt-4 text-muted">
          Abrimos WhatsApp con el resumen de tu solicitud <strong className="text-ink">{sent.code}</strong>. Envía el
          mensaje para que confirmemos disponibilidad, envío y forma de pago.
        </p>
        <p className="mt-2 text-sm text-muted">Tu pedido aún no está confirmado ni pagado.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a href={sent.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            <IconChat size={18} /> Abrir WhatsApp de nuevo
          </a>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              clear();
              setSent(null);
            }}
          >
            Ya lo envié · vaciar carrito
          </button>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-3xl">Tu carrito está vacío.</p>
        <p className="mt-2 text-muted">Descubre nuestros bolsos y elige tus favoritos.</p>
        <Link href="/tienda" className="btn btn-primary mt-8">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  const days = quote ? `${quote.mtoMinDays} a ${quote.mtoMaxDays} días hábiles` : "";

  return (
    <div className="grid gap-10 pt-8 lg:grid-cols-[1fr_380px] lg:gap-16">
      <ul className="divide-y divide-line border-b border-line" aria-busy={loading}>
        {(quote?.lines ?? []).map((l) => (
          <li key={l.key} className="flex gap-4 py-6 first:pt-0 md:gap-6">
            <Link href={l.slug ? `/producto/${l.slug}` : "#"} className="relative h-32 w-24 shrink-0 bg-sand md:h-40 md:w-32">
              {l.image && <Image src={l.image} alt={l.name} fill sizes="128px" className="object-cover" />}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-serif text-xl leading-tight md:text-2xl">{l.name}</h2>
                  {l.reference && <p className="text-xs text-muted">Ref. {l.reference}</p>}
                </div>
                <p className="shrink-0 text-sm">{l.ok ? formatCOP(l.subtotal) : "—"}</p>
              </div>
              <dl className="mt-2 space-y-0.5 text-sm text-muted">
                {l.color && (
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Color</dt>
                    <span className="h-3 w-3 rounded-full ring-1 ring-ink/15" style={{ background: l.colorHex }} />
                    <dd>{l.color}</dd>
                  </div>
                )}
                {l.personalization && (
                  <div>
                    <dt className="inline">Personalización: </dt>
                    <dd className="inline text-ink">{l.personalization}</dd>
                  </div>
                )}
                {l.ok && (
                  <div>
                    <dt className="sr-only">Disponibilidad</dt>
                    <dd>
                      {l.madeToOrderQty === 0 && <span className="text-success">Entrega inmediata</span>}
                      {l.madeToOrderQty > 0 && l.immediateQty === 0 && (
                        <span className="text-plum">Bajo pedido · fabricación {days}</span>
                      )}
                      {l.madeToOrderQty > 0 && l.immediateQty > 0 && (
                        <span className="text-plum">
                          {l.immediateQty} inmediata(s) · {l.madeToOrderQty} bajo pedido ({days})
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {l.ok && l.quantity > 1 && <div>{formatCOP(l.unitPrice)} c/u</div>}
              </dl>
              {l.error && (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {l.error}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between pt-4">
                <QuantityStepper
                  small
                  value={l.quantity}
                  max={l.maxQty || 20}
                  onChange={(n) => setQuantity(l.key, n)}
                  disabled={!l.slug}
                />
                <button
                  type="button"
                  onClick={() => remove(l.key)}
                  className="flex items-center gap-1.5 p-2 text-xs uppercase tracking-[0.12em] text-muted hover:text-danger"
                  aria-label={`Eliminar ${l.name}`}
                >
                  <IconTrash size={16} /> <span className="hidden sm:inline">Eliminar</span>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="bg-ivory p-6 md:p-8">
          <h2 className="eyebrow text-muted">Resumen</h2>
          <div className="mt-5 flex items-baseline justify-between border-b border-line pb-5">
            <span>Total productos</span>
            <span className="text-2xl" aria-live="polite">
              {quote ? formatCOP(quote.total) : "—"} <span className="text-xs text-muted">COP</span>
            </span>
          </div>
          <p className="mt-3 text-xs text-muted">El costo de envío se confirma por WhatsApp según tu ciudad.</p>

          {quote?.hasMadeToOrder && (
            <div className="mt-5 flex gap-3 border border-taupe/40 bg-beige/70 p-4 text-sm">
              <IconNeedle size={20} className="mt-0.5 shrink-0 text-taupe" />
              <p>
                Tu pedido incluye productos <strong className="font-medium">bajo pedido</strong>. Su fabricación toma {days}{" "}
                desde la confirmación, sin contar el tiempo de envío.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <div>
              <label className="label" htmlFor="c-name">
                Tu nombre <span className="normal-case tracking-normal">(opcional)</span>
              </label>
              <input id="c-name" className="field" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="c-city">
                Ciudad de envío <span className="normal-case tracking-normal">(opcional)</span>
              </label>
              <input id="c-city" className="field" value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          )}
          {quote && !quote.whatsappConfigured && (
            <p role="alert" className="mt-4 text-sm text-danger">
              La tienda aún no ha configurado su número de WhatsApp.
            </p>
          )}

          <button
            type="button"
            className="btn btn-whatsapp mt-6"
            onClick={checkout}
            disabled={!quote?.canCheckout || sending || loading}
          >
            <IconChat size={19} />
            {sending ? "Preparando pedido…" : "Finalizar pedido por WhatsApp"}
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            No se realiza ningún cobro. Confirmaremos disponibilidad, envío y forma de pago contigo.
          </p>
        </div>
        <Link href="/tienda" className="eyebrow link-underline mt-6 inline-block pb-0.5">
          Seguir comprando
        </Link>
      </aside>
    </div>
  );
}
