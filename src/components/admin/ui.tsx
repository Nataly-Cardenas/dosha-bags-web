"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { uploadImageAction } from "@/app/admin/actions";
import { IconClose, IconImage } from "@/components/icons";
import { compressImage } from "./compress";

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="border border-line bg-white p-5 md:p-7">
      <h2 className="font-serif text-2xl text-cranberry">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
  group = false,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  htmlFor?: string;
  /** true cuando el contenido tiene varios controles (imagen, botones…). */
  group?: boolean;
}) {
  const hintEl = hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>;
  if (htmlFor || group) {
    return (
      <div role={group ? "group" : undefined} aria-label={group ? label : undefined}>
        {htmlFor ? (
          <label className="label" htmlFor={htmlFor}>
            {label}
          </label>
        ) : (
          <p className="label">{label}</p>
        )}
        {children}
        {hintEl}
      </div>
    );
  }
  // La etiqueta envuelve al campo: queda asociada sin necesidad de ids.
  return (
    <div>
      <label className="block">
        <span className="label">{label}</span>
        {children}
      </label>
      {hintEl}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-cranberry" : "bg-line"}`}
      >
        <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Notice({ kind, children }: { kind: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`border px-4 py-3 text-sm ${kind === "ok" ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"}`}
    >
      {children}
    </p>
  );
}

export async function uploadFile(file: File, folder: "productos" | "colecciones" | "sitio") {
  const blob = await compressImage(file);
  const form = new FormData();
  form.set("folder", folder);
  form.set("file", new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: blob.type || "image/jpeg" }));
  const res = await uploadImageAction(form);
  if (!res.ok) throw new Error(res.error);
  return res;
}

/** Una sola imagen (portada, colección…). */
export function SingleImage({
  value,
  onChange,
  folder,
  aspect = "aspect-[4/3]",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: "colecciones" | "sitio";
  aspect?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      onChange((await uploadFile(f, folder)).url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div>
      <div className={`relative ${aspect} max-w-md overflow-hidden border border-dashed border-line bg-sand`}>
        {value ? (
          <Image src={value} alt="" fill sizes="448px" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
            <IconImage size={28} />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}
        {busy && <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm">Subiendo…</div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-outline min-h-10 px-4" onClick={() => input.current?.click()} disabled={busy}>
          {value ? "Cambiar imagen" : "Subir imagen"}
        </button>
        {value && (
          <button type="button" className="btn min-h-10 px-4 text-danger" onClick={() => onChange(null)} disabled={busy}>
            <IconClose size={14} /> Quitar
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
