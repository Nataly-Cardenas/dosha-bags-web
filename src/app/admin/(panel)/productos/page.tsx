import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/admin/page-header";
import { ProductsTable } from "@/components/admin/products-table";
import { availabilityOf } from "@/lib/commerce";

export const metadata = { title: "Productos" };

export default async function ProductsAdmin() {
  const rows = await db.query.products.findMany({
    with: { collection: true, variants: { with: { color: true } }, images: { orderBy: [asc(schema.productImages.sortOrder)], limit: 1 } },
    orderBy: [asc(schema.products.sortOrder), asc(schema.products.name)],
  });
  const data = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    reference: p.reference,
    collection: p.collection?.name ?? "—",
    price: p.price,
    image: p.images[0]?.url ?? null,
    isVisible: p.isVisible,
    isFeatured: p.isFeatured,
    personalizable: p.personalizationEnabled,
    colors: p.variants.map((v) => ({ name: v.color.name, hex: v.color.hex, kind: availabilityOf(v), stock: v.stock })),
  }));
  return (
    <>
      <PageHeader
        title="Productos"
        description="Crea, edita, oculta o elimina productos. Un producto oculto no aparece en la tienda, pero conserva toda su información."
        actions={<Link href="/admin/productos/nuevo" className="btn btn-primary">Nuevo producto</Link>}
      />
      <ProductsTable products={data} />
    </>
  );
}
