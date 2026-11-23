"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProductAction, duplicateProductAction, toggleProductAction } from "@/app/admin/actions";
import { formatCOP, type AvailabilityKind } from "@/lib/commerce";
import { IconSearch } from "@/components/icons";

type Row = {
  id: string;
  slug: string;
  name: string;
  reference: string;
  collection: string;
  price: number;
  image: string | null;
  isVisible: boolean;
  isFeatured: boolean;
  personalizable: boolean;
  colors: { name: string; hex: string; kind: AvailabilityKind; stock: number }[];
};

const KIND_DOT: Record<AvailabilityKind, string> = { immediate: "bg-success", made_to_order: "bg-taupe", unavailable: "bg-danger" };

export function ProductsTable({ products }: { products: Row[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const list = products.filter((p) => `${p.name} ${p.reference} ${p.collection}`.toLowerCase().includes(q.toLowerCase()));

  const run = (fn: () => Promise<{ ok: boolean; error?: string; id?: string }>, after?: (r: { id?: string }) => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Error");
      else {
        after?.(r);
        router.refresh();
      }
    });

  if (!products.length) {
    return (
      <div className="border border-dashed border-line bg-white p-10 text-center">
        <p className="font-serif text-2xl">Todavía no hay productos.</p>
        <Link href="/admin/productos/nuevo" className="btn btn-primary mt-6">Crear el primero</Link>
      </div>
    );
  }

  return (
    <div className={pending ? "opacity-70" : ""}>
      <label className="relative mb-4 block max-w-md">
        <span className="sr-only">Buscar</span>
        <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="field pl-10" placeholder="Buscar por nombre, referencia o colección" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
      <ul className="divide-y divide-line border border-line bg-white">
        {list.map((p) => (
          <li key={p.id} className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
            <Link href={`/admin/productos/${p.id}`} className="flex min-w-0 flex-1 items-center gap-4">
              <div className="relative h-20 w-16 shrink-0 bg-sand">
                {p.image && <Image src={p.image} alt="" fill sizes="64px" className="object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-xs text-muted">Ref. {p.reference} · {p.collection} · {formatCOP(p.price)}</p>
                <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  {p.colors.map((c) => (
                    <li key={c.name} className="flex items-center gap-1.5" title={c.kind === "immediate" ? `${c.stock} en inventario` : c.kind === "made_to_order" ? "Bajo pedido" : "No disponible"}>
                      <span className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[c.kind]}`} />
                      {c.name}{c.kind === "immediate" ? ` (${c.stock})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {!p.isVisible && <span className="eyebrow bg-line px-2 py-1 text-[0.6rem]">Oculto</span>}
              {p.isFeatured && <span className="eyebrow bg-beige px-2 py-1 text-[0.6rem]">Destacado</span>}
              {p.personalizable && <span className="eyebrow bg-ivory px-2 py-1 text-[0.6rem]">Personalizable</span>}
              <button className="border border-line px-3 py-2 hover:border-taupe" onClick={() => run(() => toggleProductAction(p.id, "isVisible", !p.isVisible))}>
                {p.isVisible ? "Ocultar" : "Publicar"}
              </button>
              <button className="border border-line px-3 py-2 hover:border-taupe" onClick={() => run(() => toggleProductAction(p.id, "isFeatured", !p.isFeatured))}>
                {p.isFeatured ? "Quitar de destacados" : "Destacar"}
              </button>
              <Link href={`/admin/productos/${p.id}`} className="border border-cranberry bg-cranberry px-3 py-2 text-ivory">Editar</Link>
              <details className="relative">
                <summary className="cursor-pointer list-none border border-line px-3 py-2 hover:border-taupe">Más</summary>
                <div className="absolute right-0 z-10 mt-1 w-48 border border-line bg-white p-1 shadow-sm">
                  {p.isVisible && <a href={`/producto/${p.slug}`} target="_blank" className="block px-3 py-2 hover:bg-ivory">Ver en la tienda ↗</a>}
                  <button className="block w-full px-3 py-2 text-left hover:bg-ivory" onClick={() => run(() => duplicateProductAction(p.id), (r) => r.id && router.push(`/admin/productos/${r.id}`))}>
                    Duplicar
                  </button>
                  <button
                    className="block w-full px-3 py-2 text-left text-danger hover:bg-ivory"
                    onClick={() => {
                      if (confirm(`¿Eliminar "${p.name}" definitivamente? Se borrarán también sus fotos. Si solo quieres retirarlo, usa "Ocultar".`)) run(() => deleteProductAction(p.id));
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </details>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="p-6 text-sm text-muted">Ningún producto coincide con la búsqueda.</li>}
      </ul>
    </div>
  );
}
