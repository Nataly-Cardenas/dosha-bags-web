"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/admin/actions";
import { IconClose, IconMenu } from "@/components/icons";

const LINKS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/colecciones", label: "Colecciones" },
  { href: "/admin/categorias", label: "Categorías y colores" },
  { href: "/admin/pedidos", label: "Solicitudes de pedido" },
  { href: "/admin/ajustes", label: "Ajustes de la tienda" },
  { href: "/admin/cuenta", label: "Mi cuenta" },
];

export function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Panel" className="flex flex-col gap-0.5">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active(l.href) ? "page" : undefined}
          className={`px-3 py-2.5 text-sm transition-colors ${active(l.href) ? "bg-ivory/15 text-ivory" : "text-ivory/70 hover:bg-ivory/10 hover:text-ivory"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="space-y-3 border-t border-ivory/15 pt-4 text-sm">
      <a href="/" target="_blank" className="block text-ivory/80 hover:text-ivory">Ver la tienda ↗</a>
      <p className="truncate text-xs text-ivory/50">{name}</p>
      <form action={logoutAction}>
        <button className="text-ivory/80 underline-offset-4 hover:text-ivory hover:underline">Cerrar sesión</button>
      </form>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-cranberry px-4 text-ivory md:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/brand/logo-dosha.png" alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
          <span className="font-serif text-lg">Panel Dosha</span>
        </Link>
        <button type="button" className="-mr-2 p-2" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(true)}>
          <IconMenu size={22} />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-cranberry p-4 md:hidden" role="dialog" aria-modal="true" aria-label="Menú del panel">
          <div className="mb-4 flex justify-end text-ivory">
            <button type="button" className="p-2" aria-label="Cerrar menú" onClick={() => setOpen(false)}>
              <IconClose size={22} />
            </button>
          </div>
          <div className="flex-1">{nav}</div>
          {footer}
        </div>
      )}
      <aside className="sticky top-0 hidden h-svh flex-col justify-between bg-cranberry p-5 md:flex">
        <div>
          <Link href="/admin" className="mb-8 flex items-center gap-3 text-ivory">
            <Image src="/brand/logo-dosha.png" alt="" width={44} height={44} className="h-11 w-11 rounded-full" />
            <span className="font-serif text-xl leading-none">Panel<br /><span className="text-sm text-ivory/60">Dosha Bags</span></span>
          </Link>
          {nav}
        </div>
        {footer}
      </aside>
    </>
  );
}
