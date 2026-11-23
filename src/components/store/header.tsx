"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconBag, IconClose, IconMenu, IconSearch } from "@/components/icons";
import { useCart } from "./cart-context";

const NAV = [
  { href: "/tienda", label: "Tienda" },
  { href: "/colecciones", label: "Colecciones" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/informacion", label: "Información" },
];

export function Header({
  announcement,
  collections,
}: {
  announcement: string;
  collections: { slug: string; name: string }[];
}) {
  const pathname = usePathname();
  const { count, ready, lastAdded } = useCart();
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    if (!lastAdded) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 700);
    return () => clearTimeout(t);
  }, [lastAdded]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {announcement && (
        <div className="bg-cranberry text-ivory">
          <p className="container-x eyebrow py-2 text-center text-[0.65rem]">{announcement}</p>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
        <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-20">
          <div className="flex items-center">
            <button
              type="button"
              className="-ml-2 p-2 md:hidden"
              aria-label="Abrir menú"
              aria-expanded={open}
              aria-controls="menu-movil"
              onClick={() => setOpen(true)}
            >
              <IconMenu size={22} />
            </button>
            <nav aria-label="Principal" className="hidden gap-8 md:flex">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="eyebrow link-underline pb-0.5"
                  aria-current={isActive(n.href) ? "page" : undefined}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>

          <Link href="/" aria-label="Dosha Bags, ir al inicio" className="block">
            <Image
              src="/brand/logo-dosha.png"
              alt="Dosha Bags"
              width={64}
              height={64}
              priority
              className="h-11 w-11 rounded-full md:h-14 md:w-14"
            />
          </Link>

          <div className="flex items-center justify-end gap-1">
            <Link href="/tienda#buscar" className="p-2" aria-label="Buscar productos">
              <IconSearch size={21} />
            </Link>
            <Link
              href="/carrito"
              className="relative -mr-2 p-2"
              aria-label={`Carrito, ${ready ? count : 0} productos`}
            >
              <IconBag size={22} />
              {ready && count > 0 && (
                <span
                  className={`absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-cranberry px-1 text-[0.62rem] font-medium text-ivory transition-transform duration-300 ${bump ? "scale-125" : "scale-100"}`}
                >
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Menú móvil */}
      <div
        id="menu-movil"
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        className={`fixed inset-0 z-50 bg-paper transition-opacity duration-300 md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        hidden={!open}
      >
        <div className="container-x flex h-16 items-center justify-between border-b border-line">
          <span className="eyebrow">Menú</span>
          <button type="button" className="-mr-2 p-2" aria-label="Cerrar menú" onClick={() => setOpen(false)}>
            <IconClose size={22} />
          </button>
        </div>
        <nav aria-label="Menú móvil" className="container-x flex flex-col pt-8">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="border-b border-line py-4 font-serif text-4xl"
              aria-current={isActive(n.href) ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
          {collections.length > 0 && (
            <div className="pt-8">
              <p className="eyebrow mb-3 text-muted">Colecciones</p>
              <ul className="space-y-2.5">
                {collections.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/colecciones/${c.slug}`} className="text-base">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link href="/carrito" className="btn btn-primary mt-10">
            Ver carrito {ready && count > 0 ? `(${count})` : ""}
          </Link>
        </nav>
      </div>
    </>
  );
}
