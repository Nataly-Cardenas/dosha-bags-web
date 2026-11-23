"use client";

import { useState } from "react";
import { updateOrderAction } from "@/app/admin/actions";
import { formatCOP } from "@/lib/commerce";
import type { OrderLineSnapshot } from "@/db/schema";
import { STATUS_LABEL } from "./order-status";

type Order = {
  id: number;
  code: string;
  customerName: string;
  customerCity: string;
  items: OrderLineSnapshot[];
  total: number;
  hasMadeToOrder: boolean;
  status: keyof typeof STATUS_LABEL;
  adminNote: string;
  createdAt: string;
};

export function OrdersList({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState<string>("");
  const list = filter ? orders.filter((o) => o.status === filter) : orders;
  if (!orders.length) return <p className="border border-dashed border-line bg-white p-8 text-sm text-muted">Aún no hay solicitudes.</p>;
  return (
    <>
      <select className="field mb-4 max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar por estado">
        <option value="">Todos los estados</option>
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <ul className="space-y-3">
        {list.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </ul>
    </>
  );
}

function OrderCard({ order }: { order: Order }) {
  const [status, setStatus] = useState(order.status);
  const [note, setNote] = useState(order.adminNote);
  const [saved, setSaved] = useState<"" | "ok" | "error">("");
  const save = async (s = status, n = note) => {
    const r = await updateOrderAction({ id: order.id, status: s, adminNote: n });
    setSaved(r.ok ? "ok" : "error");
  };
  return (
    <li className="border border-line bg-white">
      <details>
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-6 gap-y-1 p-4">
          <span className="font-medium">{order.code}</span>
          <span className="text-sm text-muted">{new Date(order.createdAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" })}</span>
          <span className="text-sm">{order.customerName || "Sin nombre"}{order.customerCity && ` · ${order.customerCity}`}</span>
          <span className="text-sm">{formatCOP(order.total)}</span>
          {order.hasMadeToOrder && <span className="eyebrow bg-beige px-2 py-0.5 text-[0.6rem]">Incluye encargo</span>}
          <span className={`eyebrow ml-auto text-[0.6rem] ${status === "pendiente" ? "text-plum" : status === "cancelado" ? "text-danger" : "text-success"}`}>{STATUS_LABEL[status]}</span>
        </summary>
        <div className="border-t border-line p-4">
          <ul className="space-y-2 text-sm">
            {order.items.map((l, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>
                  {l.quantity} × {l.name} (Ref. {l.reference}) · {l.color}
                  {l.personalization && <span className="block text-xs text-muted">Personalización: {l.personalization}</span>}
                  {l.madeToOrderQty > 0 && <span className="block text-xs text-plum">{l.madeToOrderQty} bajo pedido</span>}
                </span>
                <span className="shrink-0">{formatCOP(l.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
            <div>
              <label className="label">Estado</label>
              <select className="field" value={status} onChange={(e) => { const s = e.target.value as Order["status"]; setStatus(s); save(s, note); }}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nota interna</label>
              <input className="field" value={note} onChange={(e) => { setNote(e.target.value); setSaved(""); }} placeholder="Ej.: pagó por transferencia, envío por Servientrega" />
            </div>
            <button type="button" className="btn btn-outline" onClick={() => save()}>Guardar nota</button>
          </div>
          {saved === "ok" && <p className="mt-2 text-sm text-success">Guardado.</p>}
          {saved === "error" && <p className="mt-2 text-sm text-danger">No se pudo guardar.</p>}
        </div>
      </details>
    </li>
  );
}
