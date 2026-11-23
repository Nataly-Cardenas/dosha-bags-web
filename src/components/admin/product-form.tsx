"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { saveColorAction, saveProductAction, type ProductInput } from "@/app/admin/actions";
import { availabilityOf, AVAILABILITY_LABEL, formatCOP, slugify, type VariantStatus } from "@/lib/commerce";
import type { PersonalizationOption } from "@/db/schema";
import { IconClose, IconDown, IconImage, IconPlus, IconTrash, IconUp } from "@/components/icons";
import { Field, Notice, Section, Toggle, uploadFile } from "./ui";

type Options = {
  collections: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  colors: { id: string; name: string; hex: string }[];
};

type Existing = {
  id: string;
  name: string;
  reference: string;
  slug: string;
  collectionId: string | null;
  categoryId: string | null;
  description: string;
  details: string;
  care: string;
  price: number;
  isVisible: boolean;
  isFeatured: boolean;
  isNew: boolean;
  sortOrder: number;
  personalizationEnabled: boolean;
  personalizationLabel: string;
  personalizationMaxChars: number;
  personalizationPrice: number;
  personalizationCharset: string;
  personalizationRequired: boolean;
  personalizationNote: string;
  personalizationOptions: PersonalizationOption[];
  variants: { id: string; colorId: string; status: VariantStatus; stock: number; allowMadeToOrder: boolean; priceOverride: number | null }[];
  images: { url: string; alt: string; variantId: string | null; width: number | null; height: number | null }[];
};

type Variant = { id: string; colorId: string; status: VariantStatus; stock: string; allowMadeToOrder: boolean; priceOverride: string };
type Img = { url: string; alt: string; variantId: string | null; width: number | null; height: number | null };

const uid = () => crypto.randomUUID();

const STATUS_OPTIONS: { value: VariantStatus; label: string }[] = [
  { value: "in_stock", label: "Se vende desde inventario" },
  { value: "made_to_order", label: "Solo bajo pedido (fabricación)" },
  { value: "unavailable", label: "Temporalmente no disponible" },
];

export function ProductForm({ options, product, created }: { options: Options; product?: Existing; created?: boolean }) {
  const router = useRouter();
  const [colors, setColors] = useState(options.colors);
  const [f, setF] = useState(() => ({
    name: product?.name ?? "",
    reference: product?.reference ?? "",
    slug: product?.slug ?? "",
    collectionId: product?.collectionId ?? "",
    categoryId: product?.categoryId ?? "",
    description: product?.description ?? "",
    details: product?.details ?? "",
    care: product?.care ?? "",
    price: product ? String(product.price) : "",
    isVisible: product?.isVisible ?? true,
    isFeatured: product?.isFeatured ?? false,
    isNew: product?.isNew ?? false,
    sortOrder: String(product?.sortOrder ?? 0),
    personalizationEnabled: product?.personalizationEnabled ?? false,
    personalizationLabel: product?.personalizationLabel ?? "Iniciales o nombre",
    personalizationMaxChars: String(product?.personalizationMaxChars ?? 3),
    personalizationPrice: String(product?.personalizationPrice ?? 0),
    personalizationCharset: (product?.personalizationCharset ?? "letters") as "letters" | "letters_numbers",
    personalizationRequired: product?.personalizationRequired ?? false,
    personalizationNote: product?.personalizationNote ?? "",
  }));
  const [persOptions, setPersOptions] = useState<{ label: string; choices: { name: string; price: string; hex: string }[] }[]>(
    () =>
      product?.personalizationOptions.map((o) => ({
        label: o.label,
        choices: o.choices.map((c) => ({ name: c.name, price: String(c.price), hex: c.hex ?? "" })),
      })) ?? [],
  );
  const [variants, setVariants] = useState<Variant[]>(
    () =>
      product?.variants.map((v) => ({
        id: v.id,
        colorId: v.colorId,
        status: v.status,
        stock: String(v.stock),
        allowMadeToOrder: v.allowMadeToOrder,
        priceOverride: v.priceOverride == null ? "" : String(v.priceOverride),
      })) ?? [{ id: uid(), colorId: "", status: "in_stock", stock: "0", allowMadeToOrder: true, priceOverride: "" }],
  );
  const [images, setImages] = useState<Img[]>(() => product?.images ?? []);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(
    created ? { kind: "ok", text: "Producto creado." } : null,
  );
  const [dirty, setDirty] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setDirty(true);
  };
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const touch = () => setDirty(true);
  const updateVariant = (id: string, patch: Partial<Variant>) => {
    setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    touch();
  };
  const move = <T,>(list: T[], i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return list;
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setMsg(null);
    const list = Array.from(files).slice(0, 20);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const r = await uploadFile(file, "productos");
        setImages((imgs) => [...imgs, { url: r.url, alt: "", variantId: null, width: r.width, height: r.height }]);
        touch();
      } catch (e) {
        setMsg({ kind: "error", text: `${file.name}: ${e instanceof Error ? e.message : "no se pudo subir"}` });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const payload: ProductInput = {
      id: product?.id,
      name: f.name,
      reference: f.reference,
      slug: f.slug,
      collectionId: f.collectionId || null,
      categoryId: f.categoryId || null,
      description: f.description,
      details: f.details,
      care: f.care,
      price: f.price as unknown as number,
      isVisible: f.isVisible,
      isFeatured: f.isFeatured,
      isNew: f.isNew,
      sortOrder: f.sortOrder as unknown as number,
      personalizationEnabled: f.personalizationEnabled,
      personalizationLabel: f.personalizationLabel,
      personalizationMaxChars: f.personalizationMaxChars as unknown as number,
      personalizationPrice: (f.personalizationPrice || "0") as unknown as number,
      personalizationCharset: f.personalizationCharset,
      personalizationRequired: f.personalizationRequired,
      personalizationNote: f.personalizationNote,
      personalizationOptions: persOptions.map((o) => ({
        label: o.label,
        choices: o.choices.map((c) => ({ name: c.name, price: (c.price || "0") as unknown as number, hex: c.hex || undefined })),
      })),
      variants: variants.map((v) => ({
        id: v.id,
        colorId: v.colorId,
        status: v.status,
        stock: (v.stock || "0") as unknown as number,
        allowMadeToOrder: v.allowMadeToOrder,
        priceOverride: v.priceOverride.trim() ? (v.priceOverride as unknown as number) : null,
      })),
      images,
    };
    const res = await saveProductAction(payload).catch(() => ({ ok: false as const, error: "Sin conexión. Inténtalo de nuevo." }));
    setSaving(false);
    if (!res.ok) {
      setMsg({ kind: "error", text: res.error });
      return;
    }
    setDirty(false);
    setMsg({ kind: "ok", text: "Cambios guardados. Ya se ven en la tienda." });
    if (!product) router.replace(`/admin/productos/${res.id}?creado=1`);
    else router.refresh();
  };

  const colorName = (id: string) => colors.find((c) => c.id === id)?.name ?? "";

  return (
    <div className="space-y-6 pb-28">
      <Section title="Información básica">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nombre del producto" htmlFor="p-name">
            <input id="p-name" className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej.: Bolso Élodie" />
          </Field>
          <Field label="Referencia" htmlFor="p-ref" hint="El código con el que identificas el producto. Aparece en el pedido de WhatsApp.">
            <input id="p-ref" className="field" value={f.reference} onChange={(e) => set("reference", e.target.value)} placeholder="Ej.: DB-014" />
          </Field>
          <Field label="Precio (COP)" htmlFor="p-price" hint={f.price ? `Se mostrará como ${formatCOP(Number(f.price) || 0)}` : "Solo números, sin puntos ni signo $."}>
            <input id="p-price" className="field" inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))} placeholder="289000" />
          </Field>
          <Field label="Colección" htmlFor="p-col">
            <select id="p-col" className="field" value={f.collectionId} onChange={(e) => set("collectionId", e.target.value)}>
              <option value="">Sin colección</option>
              {options.collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Categoría" htmlFor="p-cat" hint="Ej.: Bolsos, Estuches. Se crean en «Categorías y colores».">
            <select id="p-cat" className="field" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">Sin categoría</option>
              {options.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Descripción" htmlFor="p-desc" hint="Deja una línea en blanco para separar párrafos.">
          <textarea id="p-desc" className="field min-h-32" value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Materiales y medidas (opcional)" htmlFor="p-det">
            <textarea id="p-det" className="field min-h-28" value={f.details} onChange={(e) => set("details", e.target.value)} placeholder={"Material: …\nMedidas: …"} />
          </Field>
          <Field label="Cuidados (opcional)" htmlFor="p-care">
            <textarea id="p-care" className="field min-h-28" value={f.care} onChange={(e) => set("care", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section
        title="Colores, inventario y disponibilidad"
        description="Cada color tiene su propio inventario. Cuando un color se agota, puede pasar automáticamente a «bajo pedido» si lo permites."
      >
        <ul className="space-y-4">
          {variants.map((v, i) => {
            const kind = availabilityOf({ status: v.status, stock: Number(v.stock) || 0, allowMadeToOrder: v.allowMadeToOrder });
            const hex = colors.find((c) => c.id === v.colorId)?.hex;
            return (
              <li key={v.id} className="border border-line bg-paper p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-5 w-5 rounded-full ring-1 ring-ink/20" style={{ background: hex ?? "transparent" }} />
                    {colorName(v.colorId) || `Color ${i + 1}`}
                  </p>
                  <div className="flex items-center gap-1">
                    <button type="button" className="p-2 disabled:opacity-30" aria-label="Subir" disabled={i === 0} onClick={() => { setVariants((vs) => move(vs, i, -1)); touch(); }}><IconUp size={16} /></button>
                    <button type="button" className="p-2 disabled:opacity-30" aria-label="Bajar" disabled={i === variants.length - 1} onClick={() => { setVariants((vs) => move(vs, i, 1)); touch(); }}><IconDown size={16} /></button>
                    <button
                      type="button"
                      className="p-2 text-danger disabled:opacity-30"
                      aria-label="Quitar color"
                      disabled={variants.length === 1}
                      onClick={() => {
                        setVariants((vs) => vs.filter((x) => x.id !== v.id));
                        setImages((imgs) => imgs.map((img) => (img.variantId === v.id ? { ...img, variantId: null } : img)));
                        touch();
                      }}
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Field label="Color" group>
                    <ColorSelect
                      colors={colors}
                      value={v.colorId}
                      taken={variants.filter((x) => x.id !== v.id).map((x) => x.colorId)}
                      onChange={(id) => updateVariant(v.id, { colorId: id })}
                      onCreated={(c) => {
                        setColors((cs) => [...cs, c].sort((a, b) => a.name.localeCompare(b.name, "es")));
                        updateVariant(v.id, { colorId: c.id });
                      }}
                    />
                  </Field>
                  <Field label="Estado">
                    <select className="field" value={v.status} onChange={(e) => updateVariant(v.id, { status: e.target.value as VariantStatus })}>
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  {v.status === "in_stock" && (
                    <Field label="Unidades en inventario">
                      <input className="field" inputMode="numeric" value={v.stock} onChange={(e) => updateVariant(v.id, { stock: e.target.value.replace(/\D/g, "") })} />
                    </Field>
                  )}
                  <Field label="Precio distinto (opcional)" hint={v.priceOverride ? formatCOP(Number(v.priceOverride)) : "Vacío = precio del producto"}>
                    <input className="field" inputMode="numeric" value={v.priceOverride} onChange={(e) => updateVariant(v.id, { priceOverride: e.target.value.replace(/\D/g, "") })} />
                  </Field>
                </div>
                {v.status === "in_stock" && (
                  <div className="mt-4">
                    <Toggle
                      checked={v.allowMadeToOrder}
                      onChange={(val) => updateVariant(v.id, { allowMadeToOrder: val })}
                      label="Permitir encargo cuando se agote"
                      hint="Si no quedan unidades, el cliente podrá encargarlo (fabricación de 3 a 5 días hábiles)."
                    />
                  </div>
                )}
                <p className="mt-3 text-xs">
                  El cliente verá: <strong className={kind === "immediate" ? "text-success" : kind === "made_to_order" ? "text-plum" : "text-danger"}>{AVAILABILITY_LABEL[kind]}</strong>
                </p>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="btn btn-outline min-h-10"
          onClick={() => {
            setVariants((vs) => [...vs, { id: uid(), colorId: "", status: "in_stock", stock: "0", allowMadeToOrder: true, priceOverride: "" }]);
            touch();
          }}
        >
          <IconPlus size={15} /> Agregar color
        </button>
      </Section>

      <Section
        title="Fotografías"
        description="La primera foto es la principal. Asigna fotos a un color para que cambien cuando el cliente elija ese color. Puedes subir varias a la vez, también desde el celular."
      >
        {images.length > 0 && (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img, i) => (
              <li key={img.url} className="border border-line bg-paper">
                <div className="relative aspect-[4/5] bg-sand">
                  <Image src={img.url} alt={img.alt} fill sizes="240px" className="object-cover" />
                  {i === 0 && <span className="eyebrow absolute left-2 top-2 bg-cranberry px-2 py-1 text-[0.55rem] text-ivory">Principal</span>}
                </div>
                <div className="space-y-2 p-2">
                  <select
                    className="field min-h-9 py-1 text-sm"
                    aria-label="Color de la foto"
                    value={img.variantId ?? ""}
                    onChange={(e) => { setImages((imgs) => imgs.map((x, j) => (j === i ? { ...x, variantId: e.target.value || null } : x))); touch(); }}
                  >
                    <option value="">Todos los colores</option>
                    {variants.filter((v) => v.colorId).map((v) => (
                      <option key={v.id} value={v.id}>{colorName(v.colorId)}</option>
                    ))}
                  </select>
                  <input
                    className="field min-h-9 py-1 text-sm"
                    placeholder="Descripción (accesibilidad)"
                    aria-label="Descripción de la foto"
                    value={img.alt}
                    onChange={(e) => { setImages((imgs) => imgs.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x))); touch(); }}
                  />
                  <div className="flex justify-between">
                    <div className="flex">
                      <button type="button" className="p-2 disabled:opacity-30" aria-label="Mover antes" disabled={i === 0} onClick={() => { setImages((x) => move(x, i, -1)); touch(); }}><IconUp size={15} className="-rotate-90" /></button>
                      <button type="button" className="p-2 disabled:opacity-30" aria-label="Mover después" disabled={i === images.length - 1} onClick={() => { setImages((x) => move(x, i, 1)); touch(); }}><IconDown size={15} className="-rotate-90" /></button>
                    </div>
                    <button type="button" className="p-2 text-danger" aria-label="Quitar foto" onClick={() => { setImages((x) => x.filter((_, j) => j !== i)); touch(); }}><IconTrash size={15} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-outline min-h-10" onClick={() => fileInput.current?.click()}>
            <IconImage size={16} /> Subir fotos
          </button>
          {uploading > 0 && <span className="text-sm text-muted" role="status">Subiendo {uploading} foto(s)…</span>}
          <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        </div>
      </Section>

      <Section title="Personalización" description="Actívala solo en los productos que admiten letras, iniciales o nombres.">
        <Toggle checked={f.personalizationEnabled} onChange={(v) => set("personalizationEnabled", v)} label="Este producto se puede personalizar" />
        {f.personalizationEnabled && (
          <>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <Field label="Qué escribe el cliente" hint="Ej.: Iniciales, Nombre">
                <input className="field" value={f.personalizationLabel} onChange={(e) => set("personalizationLabel", e.target.value)} />
              </Field>
              <Field label="Máximo de caracteres">
                <input className="field" inputMode="numeric" value={f.personalizationMaxChars} onChange={(e) => set("personalizationMaxChars", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="Costo adicional (COP)" hint="0 si es gratis">
                <input className="field" inputMode="numeric" value={f.personalizationPrice} onChange={(e) => set("personalizationPrice", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="Caracteres permitidos">
                <select className="field" value={f.personalizationCharset} onChange={(e) => set("personalizationCharset", e.target.value as "letters" | "letters_numbers")}>
                  <option value="letters">Solo letras</option>
                  <option value="letters_numbers">Letras y números</option>
                </select>
              </Field>
            </div>
            <Toggle checked={f.personalizationRequired} onChange={(v) => set("personalizationRequired", v)} label="La personalización es obligatoria" hint="Si está apagado, el cliente decide si personaliza o no." />
            <Field label="Nota para el cliente (opcional)" hint="Ej.: Los productos personalizados no admiten cambios.">
              <input className="field" value={f.personalizationNote} onChange={(e) => set("personalizationNote", e.target.value)} />
            </Field>

            <div>
              <p className="label">Opciones adicionales (opcional)</p>
              <p className="mb-3 text-xs text-muted">Ej.: «Color de las letras» con alternativas Dorado, Plateado. Cada alternativa puede tener costo extra.</p>
              <div className="space-y-4">
                {persOptions.map((o, oi) => (
                  <div key={oi} className="border border-line bg-paper p-4">
                    <div className="flex gap-2">
                      <input
                        className="field"
                        placeholder="Nombre de la opción, ej.: Color de las letras"
                        value={o.label}
                        onChange={(e) => { setPersOptions((ps) => ps.map((p, j) => (j === oi ? { ...p, label: e.target.value } : p))); touch(); }}
                      />
                      <button type="button" className="px-3 text-danger" aria-label="Quitar opción" onClick={() => { setPersOptions((ps) => ps.filter((_, j) => j !== oi)); touch(); }}>
                        <IconTrash size={16} />
                      </button>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {o.choices.map((c, ci) => {
                        const upd = (patch: Partial<typeof c>) => {
                          setPersOptions((ps) => ps.map((p, j) => (j === oi ? { ...p, choices: p.choices.map((x, k) => (k === ci ? { ...x, ...patch } : x)) } : p)));
                          touch();
                        };
                        return (
                          <li key={ci} className="grid grid-cols-[1fr_110px_44px_36px] items-center gap-2">
                            <input className="field min-h-10" placeholder="Alternativa, ej.: Dorado" value={c.name} onChange={(e) => upd({ name: e.target.value })} />
                            <input className="field min-h-10" placeholder="+ COP" inputMode="numeric" aria-label="Costo extra" value={c.price} onChange={(e) => upd({ price: e.target.value.replace(/\D/g, "") })} />
                            <input type="color" className="h-10 w-11 cursor-pointer border border-line" aria-label="Tono para la vista previa" value={c.hex || "#b8913f"} onChange={(e) => upd({ hex: e.target.value })} />
                            <button type="button" className="text-danger" aria-label="Quitar alternativa" onClick={() => { setPersOptions((ps) => ps.map((p, j) => (j === oi ? { ...p, choices: p.choices.filter((_, k) => k !== ci) } : p))); touch(); }}>
                              <IconClose size={16} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <button type="button" className="mt-2 text-sm underline" onClick={() => { setPersOptions((ps) => ps.map((p, j) => (j === oi ? { ...p, choices: [...p.choices, { name: "", price: "0", hex: "" }] } : p))); touch(); }}>
                      + Agregar alternativa
                    </button>
                  </div>
                ))}
              </div>
              {persOptions.length < 5 && (
                <button type="button" className="btn btn-outline mt-3 min-h-10" onClick={() => { setPersOptions((ps) => [...ps, { label: "", choices: [{ name: "", price: "0", hex: "" }] }]); touch(); }}>
                  <IconPlus size={15} /> Agregar opción
                </button>
              )}
            </div>
          </>
        )}
      </Section>

      <Section title="Publicación">
        <div className="grid gap-5 md:grid-cols-3">
          <Toggle checked={f.isVisible} onChange={(v) => set("isVisible", v)} label="Visible en la tienda" hint="Apágalo para ocultarlo sin borrarlo." />
          <Toggle checked={f.isFeatured} onChange={(v) => set("isFeatured", v)} label="Destacado en el inicio" />
          <Toggle checked={f.isNew} onChange={(v) => set("isNew", v)} label="Marcar como «Nuevo»" />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Posición en el catálogo" hint="Número menor = aparece primero.">
            <input className="field" inputMode="numeric" value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Dirección web (opcional)" hint={`La página será /producto/${slugify(f.slug || f.name) || "…"}`}>
            <input className="field" value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="Se genera a partir del nombre" />
          </Field>
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur md:left-[240px]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-10">
          <div className="min-w-0 flex-1 text-sm">
            {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : dirty ? <span className="text-muted">Tienes cambios sin guardar.</span> : null}
          </div>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving || uploading > 0}>
            {saving ? "Guardando…" : uploading > 0 ? "Esperando fotos…" : product ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorSelect({
  colors,
  value,
  taken,
  onChange,
  onCreated,
}: {
  colors: { id: string; name: string; hex: string }[];
  value: string;
  taken: string[];
  onChange: (id: string) => void;
  onCreated: (c: { id: string; name: string; hex: string }) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#9d7960");
  const [error, setError] = useState<string | null>(null);
  if (adding) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <input className="field min-h-10" placeholder="Nombre, ej.: Vino" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <input type="color" className="h-10 w-11 shrink-0 cursor-pointer border border-line" aria-label="Tono" value={hex} onChange={(e) => setHex(e.target.value)} />
        </div>
        <div className="flex gap-3 text-sm">
          <button
            type="button"
            className="underline"
            onClick={async () => {
              const r = await saveColorAction({ name, hex });
              if (!r.ok) return setError(r.error);
              onCreated({ id: r.id, name: name.trim(), hex });
              setAdding(false);
              setName("");
              setError(null);
            }}
          >
            Guardar color
          </button>
          <button type="button" className="text-muted" onClick={() => setAdding(false)}>Cancelar</button>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
  return (
    <select
      className="field"
      aria-label="Color"
      value={value}
      onChange={(e) => (e.target.value === "__new" ? setAdding(true) : onChange(e.target.value))}
    >
      <option value="">Elige un color…</option>
      {colors.map((c) => (
        <option key={c.id} value={c.id} disabled={taken.includes(c.id)}>
          {c.name}
        </option>
      ))}
      <option value="__new">+ Crear un color nuevo…</option>
    </select>
  );
}
