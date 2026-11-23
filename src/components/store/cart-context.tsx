"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cartSchema, MAX_LINES, MAX_QTY, type CartItem } from "@/lib/cart-types";

const STORAGE_KEY = "dosha-cart-v1";

type AddInput = Omit<CartItem, "key">;

type CartCtx = {
  items: CartItem[];
  ready: boolean;
  count: number;
  add: (item: AddInput) => void;
  setQuantity: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  lastAdded: number;
};

const Ctx = createContext<CartCtx | null>(null);

/** Una línea es la misma si coinciden producto, color y personalización. */
function keyOf(i: AddInput) {
  const p = i.personalization;
  const pers = p?.text ? `${p.text}|${JSON.stringify(Object.entries(p.options ?? {}).sort())}` : "";
  return `${i.productId}:${i.variantId}:${pers}`;
}

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = cartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [lastAdded, setLastAdded] = useState(0);

  useEffect(() => {
    setItems(read());
    setReady(true);
    // Sincroniza el carrito entre pestañas abiertas.
    const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && setItems(read());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* almacenamiento no disponible (modo privado): el carrito vive en memoria */
    }
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      ready,
      count: items.reduce((s, i) => s + i.quantity, 0),
      lastAdded,
      add: (input) => {
        const key = keyOf(input);
        const current = ready ? items : read();
        const existing = current.find((i) => i.key === key);
        let next: CartItem[];
        if (existing) {
          next = current.map((i) =>
            i.key === key ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + input.quantity) } : i,
          );
        } else {
          next = [...current, { ...input, key }].slice(-MAX_LINES);
        }
        persist(next);
        setLastAdded(Date.now());
      },
      setQuantity: (key, qty) =>
        persist(items.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY, qty)) } : i))),
      remove: (key) => persist(items.filter((i) => i.key !== key)),
      clear: () => persist([]),
    }),
    [items, ready, lastAdded, persist],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
