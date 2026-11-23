import type { Metadata } from "next";
import { getSettings } from "@/lib/catalog";
import { Paragraphs } from "@/components/store/paragraphs";
import { normalizeWhatsappNumber, isValidWhatsappNumber } from "@/lib/commerce";
import { IconChat, IconInstagram } from "@/components/icons";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Información",
  description: "Envíos, fabricación bajo pedido, cambios, devoluciones y contacto de Dosha Bags.",
  alternates: { canonical: "/informacion" },
};

export default async function InfoPage() {
  const s = await getSettings();
  const sections = [
    { id: "envios", title: "Envíos", text: s.shippingText },
    { id: "fabricacion", title: "Fabricación bajo pedido", text: s.madeToOrderText },
    { id: "cambios", title: "Cambios y devoluciones", text: s.returnsText },
  ].filter((x) => x.text.trim());
  const wa = isValidWhatsappNumber(s.whatsappNumber) ? `https://wa.me/${normalizeWhatsappNumber(s.whatsappNumber)}` : null;

  return (
    <div className="container-x pt-10 md:pt-14">
      <header className="border-b border-line pb-6">
        <p className="eyebrow text-taupe">Ayuda</p>
        <h1 className="mt-3 text-5xl text-cranberry md:text-6xl">Información</h1>
      </header>
      <div className="grid gap-10 pt-10 md:grid-cols-[220px_1fr] md:gap-20">
        <nav aria-label="Secciones" className="md:sticky md:top-28 md:self-start">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 md:flex-col">
            {[...sections, { id: "contacto", title: "Contacto" }].map((x) => (
              <li key={x.id}>
                <a href={`#${x.id}`} className="eyebrow link-underline pb-0.5">
                  {x.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="max-w-2xl space-y-16">
          {sections.map((x) => (
            <section key={x.id} id={x.id} className="scroll-mt-28">
              <h2 className="text-4xl text-cranberry">{x.title}</h2>
              <div className="prose-dosha mt-5 text-muted">
                <Paragraphs text={x.text} />
              </div>
            </section>
          ))}
          <section id="contacto" className="scroll-mt-28">
            <h2 className="text-4xl text-cranberry">Contacto</h2>
            {s.contactText && (
              <div className="prose-dosha mt-5 text-muted">
                <Paragraphs text={s.contactText} />
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <IconChat size={18} /> WhatsApp
                </a>
              )}
              {s.instagramUrl && (
                <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                  <IconInstagram size={18} /> Instagram
                </a>
              )}
            </div>
            {s.email && (
              <p className="mt-4 text-sm text-muted">
                Correo: <a className="text-ink underline" href={`mailto:${s.email}`}>{s.email}</a>
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
