"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteCollectionAction, moveAction, saveCollectionAction } from "@/app/admin/actions";
import { IconDown, IconUp } from "@/components/icons";
import { Field, Notice, SingleImage, Toggle } from "./ui";

type C = { id: string; name: string; slug: string; description: string; imageUrl: string | null; isVisible: boolean; isFeatured: boolean; count: number };

export function CollectionsManager({ collections }: { collections: C[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      {collections.map((c, i) =>
        editing === c.id ? (
          <CollectionForm key={c.id} initial={c} onDone={() => { setEditing(null); router.refresh(); }} onCancel={() => setEditing(null)} />
        ) : (
          <div key={c.id} className="flex flex-wrap items-center gap-4 border border-line bg-white p-4">
            <div className="flex flex-col">
              <button type="button" className="p-1 disabled:opacity-30" aria-label="Subir" disabled={i === 0} onClick={async () => { await moveAction("collections", c.id, -1); router.refresh(); }}><IconUp size={16} /></button>
              <button type="button" className="p-1 disabled:opacity-30" aria-label="Bajar" disabled={i === collections.length - 1} onClick={async () => { await moveAction("collections", c.id, 1); router.refresh(); }}><IconDown size={16} /></button>
            </div>
            <div className="relative h-16 w-20 shrink-0 bg-sand">{c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="80px" className="object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted">
                {c.count} producto(s) · /colecciones/{c.slug}
                {!c.isVisible && " · oculta"}
                {c.isFeatured && " · destacada"}
              </p>
            </div>
            <button type="button" className="btn btn-outline min-h-10 px-4" onClick={() => setEditing(c.id)}>Editar</button>
          </div>
        ),
      )}
      {editing === "new" ? (
        <CollectionForm onDone={() => { setEditing(null); router.refresh(); }} onCancel={() => setEditing(null)} />
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>Nueva colección</button>
      )}
    </div>
  );
}

function CollectionForm({ initial, onDone, onCancel }: { initial?: C; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    imageUrl: initial?.imageUrl ?? null,
    isVisible: initial?.isVisible ?? true,
    isFeatured: initial?.isFeatured ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-5 border border-cranberry/40 bg-white p-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nombre"><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Dirección web (opcional)" hint="Se genera a partir del nombre."><input className="field" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
      </div>
      <Field label="Descripción corta"><textarea className="field min-h-20" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <Field label="Imagen de la colección" group><SingleImage folder="colecciones" value={f.imageUrl} onChange={(url) => setF({ ...f, imageUrl: url })} /></Field>
      <div className="flex flex-wrap gap-8">
        <Toggle checked={f.isVisible} onChange={(v) => setF({ ...f, isVisible: v })} label="Visible" hint="Si la ocultas, sus productos también se ocultan." />
        <Toggle checked={f.isFeatured} onChange={(v) => setF({ ...f, isFeatured: v })} label="Destacada en el inicio" />
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await saveCollectionAction({ id: initial?.id, ...f });
            setBusy(false);
            if (r.ok) onDone();
            else setError(r.error);
          }}
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" className="btn" onClick={onCancel}>Cancelar</button>
        {initial && (
          <button
            type="button"
            className="btn ml-auto text-danger"
            onClick={async () => {
              if (!confirm(`¿Eliminar la colección "${initial.name}"? Sus ${initial.count} producto(s) no se borran: quedarán sin colección.`)) return;
              const r = await deleteCollectionAction(initial.id);
              if (r.ok) onDone();
              else setError(r.error);
            }}
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
