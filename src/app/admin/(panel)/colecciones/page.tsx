import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/admin/page-header";
import { CollectionsManager } from "@/components/admin/collections-manager";

export const metadata = { title: "Colecciones" };

export default async function CollectionsAdmin() {
  const [rows, counts] = await Promise.all([
    db.select().from(schema.collections).orderBy(asc(schema.collections.sortOrder), asc(schema.collections.name)),
    db.select({ id: schema.products.collectionId, n: sql<number>`count(*)::int` }).from(schema.products).groupBy(schema.products.collectionId),
  ]);
  const data = rows.map((c) => ({ ...c, count: counts.find((x) => x.id === c.id)?.n ?? 0 }));
  return (
    <>
      <PageHeader title="Colecciones" description="Organiza tus productos en colecciones. Las colecciones «destacadas» aparecen en la página de inicio. Usa las flechas para cambiar el orden." />
      <CollectionsManager collections={data} />
    </>
  );
}
