import type { Metadata } from "next";
import { CartView } from "@/components/store/cart-view";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-x pt-10 md:pt-14">
      <header className="border-b border-line pb-6">
        <p className="eyebrow text-taupe">Tu selección</p>
        <h1 className="mt-3 text-5xl text-cranberry md:text-6xl">Carrito</h1>
      </header>
      <CartView />
    </div>
  );
}
