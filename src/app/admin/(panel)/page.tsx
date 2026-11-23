import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSettings } from "@/lib/catalog";
import { availabilityOf, formatCOP, isValidWhatsappNumber } from "@/lib/commerce";
import { PageHeader } from "@/components/admin/page-header";
import { STATUS_LABEL } from "@/components/admin/order-status";

export default async function AdminHome() {
  const [settings, products, variants, orders, [{ pending }]] = await Promise.all([
    getSettings(),
    db.select({ isVisible: schema.products.isVisible }).from(schema.products),
    db.select().from(schema.productVariants),
    db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(5),
    db.select({ pending: sql<number>`count(*) filter (where status = 'pendiente')::int` }).from(schema.orders),
  ]);
  const kinds = variants.map(availabilityOf);
  const stats = [
    { label: "Productos publicados", value: products.filter((p) => p.isVisible).length, href: "/admin/productos" },
    { label: "Colores con entrega inmediata", value: kinds.filter((k) => k === "immediate").length, href: "/admin/inventario" },
    { label: "Colores bajo pedido", value: kinds.filter((k) => k === "made_to_order").length, href: "/admin/inventario" },
    { label: "Solicitudes pendientes", value: pending, href: "/admin/pedidos" },
  ];
  const warnings: { text: string; href: string }[] = [];
  if (!isValidWhatsappNumber(settings.whatsappNumber)) warnings.push({ text: "Configura el número de WhatsApp para recibir pedidos.", href: "/admin/ajustes" });
  if (settings.whatsappNumber === "573000000000") warnings.push({ text: "El WhatsApp es un número de prueba. Cámbialo por el real.", href: "/admin/ajustes" });
  if (!settings.heroImageUrl) warnings.push({ text: "Sube una imagen de portada para la página de inicio.", href: "/admin/ajustes" });
  if (/\[Texto provisional\]/.test(settings.aboutBody + settings.shippingText + settings.returnsText)) {
    warnings.push({ text: "Hay textos provisionales en Nosotros o Información. Revísalos.", href: "/admin/ajustes" });
  }

  return (
    <>
      <PageHeader
        title="Resumen"
        description="Desde aquí administras todo: productos, fotos, inventario, colecciones y los datos de la tienda. Los cambios se ven en la tienda en cuanto los guardas."
        actions={<Link href="/admin/productos/nuevo" className="btn btn-primary">Nuevo producto</Link>}
      />
      {warnings.length > 0 && (
        <ul className="mb-8 space-y-2">
          {warnings.map((w) => (
            <li key={w.text}>
              <Link href={w.href} className="block border border-taupe/40 bg-beige px-4 py-3 text-sm hover:border-taupe">
                ⚠ {w.text} <span className="underline">Resolver</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="border border-line bg-white p-5 hover:border-taupe">
            <p className="font-serif text-4xl text-cranberry">{s.value}</p>
            <p className="mt-1 text-xs text-muted">{s.label}</p>
          </Link>
        ))}
      </div>
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl text-cranberry">Últimas solicitudes</h2>
          <Link href="/admin/pedidos" className="text-sm underline">Ver todas</Link>
        </div>
        {orders.length === 0 ? (
          <p className="mt-4 border border-dashed border-line bg-white p-6 text-sm text-muted">Aún no hay solicitudes de pedido.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border border-line bg-white">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-medium">{o.code}</span>
                <span className="text-muted">{o.createdAt.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" })}</span>
                <span>{formatCOP(o.total)}</span>
                <span className="eyebrow text-[0.6rem]">{STATUS_LABEL[o.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
