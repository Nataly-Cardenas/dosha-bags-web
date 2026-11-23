import Link from "next/link";
import Image from "next/image";
import { IconChat, IconInstagram } from "@/components/icons";
import { normalizeWhatsappNumber, isValidWhatsappNumber } from "@/lib/commerce";
import type { Settings } from "@/lib/catalog";

export function Footer({ settings, collections }: { settings: Settings; collections: { slug: string; name: string }[] }) {
  const wa = isValidWhatsappNumber(settings.whatsappNumber)
    ? `https://wa.me/${normalizeWhatsappNumber(settings.whatsappNumber)}`
    : null;
  return (
    <footer className="mt-24 bg-cranberry text-ivory md:mt-32">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:py-20">
        <div>
          <Image src="/brand/logo-dosha.png" alt="Dosha Bags" width={88} height={88} className="h-20 w-20 rounded-full" />
          <p className="mt-6 max-w-xs font-serif text-xl leading-snug text-beige">
            Bolsos colombianos de diseño atemporal.
          </p>
        </div>
        <FooterCol title="Tienda">
          <FooterLink href="/tienda">Todos los productos</FooterLink>
          {collections.slice(0, 5).map((c) => (
            <FooterLink key={c.slug} href={`/colecciones/${c.slug}`}>
              {c.name}
            </FooterLink>
          ))}
        </FooterCol>
        <FooterCol title="Ayuda">
          <FooterLink href="/informacion#envios">Envíos</FooterLink>
          <FooterLink href="/informacion#fabricacion">Fabricación bajo pedido</FooterLink>
          <FooterLink href="/informacion#cambios">Cambios y devoluciones</FooterLink>
          <FooterLink href="/nosotros">Nosotros</FooterLink>
        </FooterCol>
        <FooterCol title="Contacto">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-beige">
              <IconChat size={17} /> WhatsApp
            </a>
          )}
          {settings.instagramUrl && (
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-beige"
            >
              <IconInstagram size={17} /> Instagram
            </a>
          )}
          {settings.email && (
            <a href={`mailto:${settings.email}`} className="break-all hover:text-beige">
              {settings.email}
            </a>
          )}
          {settings.city && <span className="text-ivory/60">{settings.city}</span>}
        </FooterCol>
      </div>
      <div className="border-t border-ivory/15">
        <div className="container-x flex flex-col gap-2 py-6 text-xs text-ivory/60 md:flex-row md:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.storeName}. Todos los derechos reservados.
          </p>
          <p>Pedidos coordinados por WhatsApp · Precios en pesos colombianos (COP)</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="eyebrow mb-5 font-sans text-ivory/60">{title}</h2>
      <div className="flex flex-col gap-3 text-sm">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="hover:text-beige">
      {children}
    </Link>
  );
}
