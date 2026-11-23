import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/admin/page-header";
import { CategoriesManager, ColorsManager } from "@/components/admin/taxonomy-managers";

export const metadata = { title: "Categorías y colores" };

export default async function TaxonomyPage() {
  const [categories, colors, usage] = await Promise.all([
    db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name)),
    db.select().from(schema.colors).orderBy(asc(schema.colors.name)),
    db.select({ id: schema.productVariants.colorId, n: sql<number>`count(*)::int` }).from(schema.productVariants).groupBy(schema.productVariants.colorId),
  ]);
  return (
    <>
      <PageHeader title="Categorías y colores" description="Las categorías (Bolsos, Estuches…) y los colores se usan en los filtros de la tienda. Usa siempre el mismo nombre para el mismo color." />
      <div className="grid gap-8 xl:grid-cols-2">
        <CategoriesManager categories={categories} />
        <ColorsManager colors={colors.map((c) => ({ ...c, used: usage.find((u) => u.id === c.id)?.n ?? 0 }))} />
      </div>
    </>
  );
}
