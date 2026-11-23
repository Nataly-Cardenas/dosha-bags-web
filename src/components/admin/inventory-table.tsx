"use client";

import Link from "next/link";
import { useState } from "react";
import { updateVariantAction } from "@/app/admin/actions";
import { availabilityOf, AVAILABILITY_LABEL, type VariantStatus } from "@/lib/commerce";

type Row = {
  id: string;
  productId: string;
  product: string;
  reference: string;
  isVisible: boolean;
  color: string;
  hex: string;
  status: VariantStatus;
  stock: number;
  allowMadeToOrder: boolean;
};

export function InventoryTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const list = rows.filter((r) => `${r.product} ${r.reference} ${r.color}`.toLowerCase().includes(q.toLowerCase()));
  if (!rows.length) return <p className="border border-dashed border-line bg-white p-8 text-sm text-muted">Aún no hay productos con colores.</p>;
  return (
    <>
      <input className="field mb-4 max-w-md" placeholder="Buscar producto o color" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
      <ul className="divide-y divide-line border border-line bg-white">
        {list.map((r) => (
          <InventoryRow key={r.id} row={r} />
        ))}
      </ul>
    </>
  );
}

function InventoryRow({ row }: { row: Row }) {
  const [status, setStatus] = useState(row.status);
  const [stock, setStock] = useState(String(row.stock));
  const [mto, setMto] = useState(row.allowMadeToOrder);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const dirty = status !== row.status || stock !== String(row.stock) || mto !== row.allowMadeToOrder;
  const kind = availabilityOf({ status, stock: Number(stock) || 0, allowMadeToOrder: mto });

  const save = async () => {
    setState("saving");
    const r = await updateVariantAction({ id: row.id, status, stock: Number(stock) || 0, allowMadeToOrder: mto });
    if (r.ok) {
      row.status = status;
      row.stock = Number(stock) || 0;
      row.allowMadeToOrder = mto;
      setState("saved");
    } else {
      setError(r.error);
      setState("error");
    }
  };

  return (
    <li className="grid gap-3 p-4 lg:grid-cols-[1.4fr_1.3fr_110px_1fr_auto] lg:items-center">
      <div className="flex items-center gap-3">
        <span className="h-6 w-6 shrink-0 rounded-full ring-1 ring-ink/20" style={{ background: row.hex }} />
        <div className="min-w-0">
          <Link href={`/admin/productos/${row.productId}`} className="block truncate font-medium hover:underline">{row.product}</Link>
          <p className="text-xs text-muted">{row.color} · Ref. {row.reference}{!row.isVisible && " · oculto"}</p>
        </div>
      </div>
      <select className="field min-h-10 py-1 text-sm" aria-label="Estado" value={status} onChange={(e) => { setStatus(e.target.value as VariantStatus); setState("idle"); }}>
        <option value="in_stock">Se vende desde inventario</option>
        <option value="made_to_order">Solo bajo pedido</option>
        <option value="unavailable">No disponible</option>
      </select>
      <input
        className="field min-h-10 py-1 text-sm disabled:opacity-40"
        aria-label="Unidades"
        inputMode="numeric"
        disabled={status !== "in_stock"}
        value={stock}
        onChange={(e) => { setStock(e.target.value.replace(/\D/g, "")); setState("idle"); }}
      />
      <div className="text-xs">
        {status === "in_stock" && (
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-cranberry" checked={mto} onChange={(e) => { setMto(e.target.checked); setState("idle"); }} />
            Encargo al agotarse
          </label>
        )}
        <p className="mt-1 text-muted">Cliente ve: {AVAILABILITY_LABEL[kind]}</p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <button type="button" className="btn btn-primary min-h-10 px-4" disabled={!dirty || state === "saving"} onClick={save}>
          {state === "saving" ? "…" : "Guardar"}
        </button>
        {state === "saved" && !dirty && <span className="text-success">Guardado</span>}
        {state === "error" && <span className="text-danger">{error}</span>}
      </div>
    </li>
  );
}
