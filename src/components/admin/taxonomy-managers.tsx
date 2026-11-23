"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteCategoryAction, deleteColorAction, moveAction, saveCategoryAction, saveColorAction } from "@/app/admin/actions";
import { IconDown, IconTrash, IconUp } from "@/components/icons";
import { Section } from "./ui";

export function CategoriesManager({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const run = async (p: Promise<{ ok: boolean; error?: string }>) => {
    const r = await p;
    if (!r.ok) setError(r.error ?? "Error");
    else { setError(null); router.refresh(); }
    return r.ok;
  };
  return (
    <Section title="Categorías">
      <ul className="divide-y divide-line border border-line">
        {categories.map((c, i) => (
          <li key={c.id} className="flex items-center gap-2 px-3 py-2">
            <button type="button" className="p-1 disabled:opacity-30" aria-label="Subir" disabled={i === 0} onClick={() => run(moveAction("categories", c.id, -1))}><IconUp size={15} /></button>
            <button type="button" className="p-1 disabled:opacity-30" aria-label="Bajar" disabled={i === categories.length - 1} onClick={() => run(moveAction("categories", c.id, 1))}><IconDown size={15} /></button>
            <input
              className="field min-h-9 flex-1 border-transparent py-1 hover:border-line"
              defaultValue={c.name}
              aria-label="Nombre de la categoría"
              onBlur={(e) => e.target.value.trim() !== c.name && run(saveCategoryAction({ id: c.id, name: e.target.value }))}
            />
            <button type="button" className="p-2 text-danger" aria-label={`Eliminar ${c.name}`} onClick={() => confirm(`¿Eliminar la categoría "${c.name}"? Los productos no se borran.`) && run(deleteCategoryAction(c.id))}>
              <IconTrash size={15} />
            </button>
          </li>
        ))}
        {!categories.length && <li className="p-3 text-sm text-muted">Sin categorías.</li>}
      </ul>
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await run(saveCategoryAction({ name }))) setName(""); }}>
        <input className="field" placeholder="Nueva categoría, ej.: Estuches" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary shrink-0">Agregar</button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
    </Section>
  );
}

export function ColorsManager({ colors }: { colors: { id: string; name: string; hex: string; used: number }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#9d7960");
  const [error, setError] = useState<string | null>(null);
  const run = async (p: Promise<{ ok: boolean; error?: string }>) => {
    const r = await p;
    if (!r.ok) setError(r.error ?? "Error");
    else { setError(null); router.refresh(); }
    return r.ok;
  };
  return (
    <Section title="Colores" description="El tono se usa en los círculos de color de la tienda.">
      <ul className="divide-y divide-line border border-line">
        {colors.map((c) => (
          <li key={c.id} className="flex items-center gap-2 px-3 py-2">
            <input type="color" className="h-9 w-10 shrink-0 cursor-pointer border border-line" aria-label={`Tono de ${c.name}`} defaultValue={c.hex} onBlur={(e) => e.target.value !== c.hex.toLowerCase() && run(saveColorAction({ id: c.id, name: c.name, hex: e.target.value }))} />
            <input className="field min-h-9 flex-1 border-transparent py-1 hover:border-line" aria-label="Nombre del color" defaultValue={c.name} onBlur={(e) => e.target.value.trim() !== c.name && run(saveColorAction({ id: c.id, name: e.target.value, hex: c.hex }))} />
            <span className="shrink-0 text-xs text-muted">{c.used} uso(s)</span>
            <button type="button" className="p-2 text-danger" aria-label={`Eliminar ${c.name}`} onClick={() => confirm(`¿Eliminar el color "${c.name}"?`) && run(deleteColorAction(c.id))}>
              <IconTrash size={15} />
            </button>
          </li>
        ))}
        {!colors.length && <li className="p-3 text-sm text-muted">Sin colores.</li>}
      </ul>
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await run(saveColorAction({ name, hex }))) setName(""); }}>
        <input type="color" className="h-[2.9rem] w-12 shrink-0 cursor-pointer border border-line" aria-label="Tono" value={hex} onChange={(e) => setHex(e.target.value)} />
        <input className="field" placeholder="Nuevo color, ej.: Vino" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary shrink-0">Agregar</button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
    </Section>
  );
}
