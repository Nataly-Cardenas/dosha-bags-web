import { CartProvider } from "@/components/store/cart-context";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { getSettings, getVisibleCollections } from "@/lib/catalog";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, collections] = await Promise.all([getSettings(), getVisibleCollections()]);
  const cols = collections.map((c) => ({ slug: c.slug, name: c.name }));
  return (
    <CartProvider>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-cranberry focus:px-4 focus:py-2 focus:text-ivory"
      >
        Saltar al contenido
      </a>
      <Header announcement={settings.announcement} collections={cols} />
      <main id="contenido">{children}</main>
      <Footer settings={settings} collections={cols} />
    </CartProvider>
  );
}
