import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/admin/page-header";
import { InventoryTable } from "@/components/admin/inventory-table";

export const metadata = { title: "Inventario" };

export default async function InventoryPage() {
  const products = await db.query.products.findMany({
    with: { variants: { with: { color: true }, orderBy: [asc(schema.productVariants.sortOrder)] } },
    orderBy: [asc(schema.products.sortOrder), asc(schema.products.name)],
  });
  const rows = products.flatMap((p) =>
    p.variants.map((v) => ({
      id: v.id,
      productId: p.id,
      product: p.name,
      reference: p.reference,
      isVisible: p.isVisible,
      color: v.color.name,
      hex: v.color.hex,
      status: v.status,
      stock: v.stock,
      allowMadeToOrder: v.allowMadeToOrder,
    })),
  );
  return (
    <>
      <PageHeader
        title="Inventario"
        description="Actualiza rápidamente las unidades y la disponibilidad de cada color. Los cambios se guardan fila por fila. Importante: abrir WhatsApp no descuenta inventario; ajústalo cuando confirmes una venta."
      />
      <InventoryTable rows={rows} />
    </>
  );
}
