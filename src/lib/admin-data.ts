import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export async function getEditorOptions() {
  const [collections, categories, colors] = await Promise.all([
    db.select({ id: schema.collections.id, name: schema.collections.name }).from(schema.collections).orderBy(asc(schema.collections.sortOrder)),
    db.select({ id: schema.categories.id, name: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.sortOrder)),
    db.select().from(schema.colors).orderBy(asc(schema.colors.name)),
  ]);
  return { collections, categories, colors };
}

export async function getProductForEdit(id: string) {
  return db.query.products.findFirst({
    where: eq(schema.products.id, id),
    with: {
      variants: { orderBy: [asc(schema.productVariants.sortOrder)] },
      images: { orderBy: [asc(schema.productImages.sortOrder)] },
    },
  });
}
