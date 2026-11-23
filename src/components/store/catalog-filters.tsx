"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { IconClose, IconFilter, IconSearch } from "@/components/icons";
import type { CatalogFilters as F } from "@/lib/catalog";

type Facets = {
  collections: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
  colors: { name: string; hex: string }[];
};

const PRICE_RANGES = [
  { label: "Hasta $150.000", min: "", max: "150000" },
  { label: "$150.000 – $300.000", min: "150000", max: "300000" },
  { label: "Más de $300.000", min: "300000", max: "" },
];

export function CatalogFilters({
  facets,
  filters,
  total,
  children,
  hideCollection = false,
}: {
  facets: Facets;
  filters: F;
  total: number;
  children: React.ReactNode;
  hideCollection?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(filters.q ?? "");
  const searchRef = useRef<HTMLInputElement>(null);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // Búsqueda con pequeña espera para no recargar en cada tecla.
  useEffect(() => {
    if ((filters.q ?? "") === q) return;
    const t = setTimeout(() => update({ q: q.trim() || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (window.location.hash === "#buscar") searchRef.current?.focus();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const priceKey = `${filters.min ?? ""}-${filters.max ?? ""}`;
  const activeCount = [
    !hideCollection && filters.coleccion,
    filters.categoria,
    filters.color,
    filters.min != null || filters.max != null,
    filters.disponibilidad,
    filters.personalizable,
  ].filter(Boolean).length;

  const panel = (prefix: string) => (
    <div className="space-y-8">
      {!hideCollection && facets.collections.length > 0 && (
        <Group title="Colección">
          <Choice label="Todas" checked={!filters.coleccion} onSelect={() => update({ coleccion: null })} name={`${prefix}-coleccion`} />
          {facets.collections.map((c) => (
            <Choice
              key={c.slug}
              name={`${prefix}-coleccion`}
              label={c.name}
              checked={filters.coleccion === c.slug}
              onSelect={() => update({ coleccion: c.slug })}
            />
          ))}
        </Group>
      )}
      {facets.categories.length > 0 && (
        <Group title="Categoría">
          <Choice label="Todas" checked={!filters.categoria} onSelect={() => update({ categoria: null })} name={`${prefix}-categoria`} />
          {facets.categories.map((c) => (
            <Choice
              key={c.slug}
              name={`${prefix}-categoria`}
              label={c.name}
              checked={filters.categoria === c.slug}
              onSelect={() => update({ categoria: c.slug })}
            />
          ))}
        </Group>
      )}
      {facets.colors.length > 0 && (
        <Group title="Color">
          <div className="flex flex-wrap gap-2.5">
            {facets.colors.map((c) => {
              const active = filters.color?.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ color: active ? null : c.name })}
                  className={`flex items-center gap-2 border px-2.5 py-1.5 text-xs transition-colors ${active ? "border-cranberry bg-cranberry text-ivory" : "border-line hover:border-taupe"}`}
                >
                  <span className="h-3.5 w-3.5 rounded-full ring-1 ring-ink/15" style={{ background: c.hex }} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </Group>
      )}
      <Group title="Precio">
        <Choice label="Todos" name={`${prefix}-precio`} checked={priceKey === "-"} onSelect={() => update({ min: null, max: null })} />
        {PRICE_RANGES.map((r) => (
          <Choice
            key={r.label}
            name={`${prefix}-precio`}
            label={r.label}
            checked={priceKey === `${r.min}-${r.max}`}
            onSelect={() => update({ min: r.min || null, max: r.max || null })}
          />
        ))}
      </Group>
      <Group title="Disponibilidad">
        <Choice label="Todas" name={`${prefix}-disp`} checked={!filters.disponibilidad} onSelect={() => update({ disponibilidad: null })} />
        <Choice
          label="Entrega inmediata"
          name={`${prefix}-disp`}
          checked={filters.disponibilidad === "inmediata"}
          onSelect={() => update({ disponibilidad: "inmediata" })}
        />
        <Choice
          label="Bajo pedido"
          name={`${prefix}-disp`}
          checked={filters.disponibilidad === "encargo"}
          onSelect={() => update({ disponibilidad: "encargo" })}
        />
      </Group>
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-cranberry"
          checked={!!filters.personalizable}
          onChange={(e) => update({ personalizable: e.target.checked ? "1" : null })}
        />
        Solo personalizables
      </label>
    </div>
  );

  return (
    <div className="pt-6">
      {/* Barra superior: búsqueda, filtros (móvil), orden */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 basis-full sm:basis-auto" id="buscar">
          <span className="sr-only">Buscar productos</span>
          <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, color o referencia"
            className="field pl-10"
            enterKeyHint="search"
          />
        </label>
        <button type="button" className="btn btn-outline min-h-[2.9rem] flex-1 px-4 lg:hidden" onClick={() => setOpen(true)}>
          <IconFilter size={17} /> Filtrar {activeCount > 0 && `(${activeCount})`}
        </button>
        <label className="flex-1 sm:flex-none">
          <span className="sr-only">Ordenar</span>
          <select
            className="field min-w-44 pr-8"
            value={filters.orden ?? "destacados"}
            onChange={(e) => update({ orden: e.target.value === "destacados" ? null : e.target.value })}
          >
            <option value="destacados">Destacados</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="nombre">Nombre</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted" aria-live="polite">
        <span>
          {total} {total === 1 ? "producto" : "productos"}
          {pending && " · actualizando…"}
        </span>
        {activeCount > 0 && (
          <button
            type="button"
            className="link-underline pb-0.5 text-cranberry"
            onClick={() =>
              update({ coleccion: hideCollection ? filters.coleccion ?? null : null, categoria: null, color: null, min: null, max: null, disponibilidad: null, personalizable: null })
            }
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block" aria-label="Filtros">
          {panel("d")}
        </aside>
        <div className={`transition-opacity ${pending ? "opacity-60" : ""}`}>{children}</div>
      </div>

      {/* Panel de filtros móvil */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
        hidden={!open}
      >
        <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
        <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-paper">
          <div className="flex h-16 items-center justify-between border-b border-line px-5">
            <span className="eyebrow">Filtrar</span>
            <button type="button" className="-mr-2 p-2" aria-label="Cerrar filtros" onClick={() => setOpen(false)}>
              <IconClose size={22} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{panel("m")}</div>
          <div className="border-t border-line p-4">
            <button type="button" className="btn btn-primary w-full" onClick={() => setOpen(false)}>
              Ver {total} {total === 1 ? "producto" : "productos"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-3 text-muted">{title}</legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

function Choice({ label, checked, onSelect, name }: { label: string; checked: boolean; onSelect: () => void; name: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="h-4 w-4 accent-cranberry" />
      <span className={checked ? "text-cranberry" : ""}>{label}</span>
    </label>
  );
}
