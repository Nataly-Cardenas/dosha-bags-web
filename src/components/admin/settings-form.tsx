"use client";

import { useState } from "react";
import { saveSettingsAction, type SettingsInput } from "@/app/admin/actions";
import { normalizeWhatsappNumber, whatsappUrl } from "@/lib/commerce";
import { Field, Notice, Section, SingleImage } from "./ui";

type S = Omit<SettingsInput, "madeToOrderMinDays" | "madeToOrderMaxDays"> & { madeToOrderMinDays: number | string; madeToOrderMaxDays: number | string };

export function SettingsForm({ initial }: { initial: S }) {
  const [s, setS] = useState<S>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const set = <K extends keyof S>(k: K, v: S[K]) => setS((x) => ({ ...x, [k]: v }));
  const text = (k: keyof S, label: string, opts: { hint?: string; rows?: number; placeholder?: string } = {}) => (
    <Field label={label} hint={opts.hint}>
      {opts.rows ? (
        <textarea className="field" rows={opts.rows} value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value as S[typeof k])} placeholder={opts.placeholder} />
      ) : (
        <input className="field" value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value as S[typeof k])} placeholder={opts.placeholder} />
      )}
    </Field>
  );

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const r = await saveSettingsAction(s as SettingsInput).catch(() => ({ ok: false as const, error: "Sin conexión." }));
    setBusy(false);
    setMsg(r.ok ? { kind: "ok", text: "Ajustes guardados. Ya se ven en la tienda." } : { kind: "error", text: r.error });
  };

  const waDigits = normalizeWhatsappNumber(s.whatsappNumber);

  return (
    <div className="space-y-6 pb-28">
      <Section title="WhatsApp y contacto" description="Los pedidos llegan a este número de WhatsApp.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Número de WhatsApp" hint={waDigits.length >= 10 ? <>Se usará: +{waDigits} · <a className="underline" target="_blank" rel="noopener noreferrer" href={whatsappUrl(s.whatsappNumber, "Prueba desde el panel de Dosha Bags")}>probar enlace</a></> : "Ej.: 300 123 4567 (se agrega +57 automáticamente)"}>
            <input className="field" inputMode="tel" value={s.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} />
          </Field>
          {text("instagramUrl", "Instagram (enlace)", { placeholder: "https://instagram.com/doshabags" })}
          {text("email", "Correo de contacto (opcional)")}
          {text("city", "Ciudad / país", { placeholder: "Colombia" })}
          {text("storeName", "Nombre de la tienda")}
          {text("announcement", "Barra de anuncio (opcional)", { hint: "Texto corto en la franja superior. Déjalo vacío para ocultarla." })}
        </div>
        {text("seoDescription", "Descripción para Google (opcional)", { rows: 2 })}
      </Section>

      <Section title="Portada (página de inicio)">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-5">
            {text("heroEyebrow", "Texto pequeño superior", { placeholder: "Nueva temporada" })}
            {text("heroTitle", "Título principal")}
            {text("heroSubtitle", "Subtítulo", { rows: 3 })}
            {text("heroCtaLabel", "Texto del botón")}
          </div>
          <Field group label="Imagen de portada" hint="Recomendado: foto vertical o cuadrada, de buena calidad.">
            <SingleImage folder="sitio" aspect="aspect-[4/5]" value={s.heroImageUrl ?? null} onChange={(u) => set("heroImageUrl", u)} />
          </Field>
        </div>
      </Section>

      <Section title="Bloque editorial (inicio)">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-5">
            {text("editorialTitle", "Título")}
            {text("editorialBody", "Texto", { rows: 6 })}
          </div>
          <Field label="Imagen" group>
            <SingleImage folder="sitio" aspect="aspect-[4/5]" value={s.editorialImageUrl ?? null} onChange={(u) => set("editorialImageUrl", u)} />
          </Field>
        </div>
      </Section>

      <Section title="Página «Nosotros»">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-5">
            {text("aboutTitle", "Título")}
            {text("aboutBody", "Historia de la marca", { rows: 12, hint: "Deja una línea en blanco entre párrafos." })}
          </div>
          <Field label="Imagen" group>
            <SingleImage folder="sitio" aspect="aspect-[4/5]" value={s.aboutImageUrl ?? null} onChange={(u) => set("aboutImageUrl", u)} />
          </Field>
        </div>
      </Section>

      <Section title="Información y políticas" description="Se muestran en la página «Información» y en cada producto.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Días mínimos de fabricación bajo pedido">
            <input className="field" inputMode="numeric" value={String(s.madeToOrderMinDays)} onChange={(e) => set("madeToOrderMinDays", e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Días máximos de fabricación bajo pedido" hint="Días hábiles. No incluye el tiempo de envío.">
            <input className="field" inputMode="numeric" value={String(s.madeToOrderMaxDays)} onChange={(e) => set("madeToOrderMaxDays", e.target.value.replace(/\D/g, ""))} />
          </Field>
        </div>
        {text("shippingText", "Envíos", { rows: 5 })}
        {text("madeToOrderText", "Fabricación bajo pedido", { rows: 4 })}
        {text("returnsText", "Cambios y devoluciones", { rows: 5 })}
        {text("contactText", "Contacto", { rows: 3 })}
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur md:left-[240px]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-10">
          <div className="min-w-0 flex-1 text-sm">{msg && <Notice kind={msg.kind}>{msg.text}</Notice>}</div>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar ajustes"}</button>
        </div>
      </div>
    </div>
  );
}
