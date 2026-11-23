// Importa el catálogo real (catalog-import/catalog.json + fotos) a la base de datos.
//
// • Automático: scripts/migrate.mjs lo llama en cada despliegue, pero solo actúa UNA vez,
//   cuando la tienda todavía no tiene productos (queda registrado en settings.catalog_imported_at).
// • Manual: `npm run db:catalog` agrega los productos cuya referencia aún no exista
//   (no modifica ni borra los que ya están).
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const DIR = path.join(ROOT, "catalog-import");

const slugify = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Las fotos del catálogo viven en public/catalogo/ y se publican con la web (CDN de Vercel):
// no dependen de Vercel Blob, que solo se usa para las fotos que se suben desde el panel.
async function storeImage(name) {
  const data = await readFile(path.join(ROOT, "public", "catalogo", `${name}.webp`));
  const meta = await sharp(data).metadata();
  return { url: `/catalogo/${name}.webp`, width: meta.width, height: meta.height };
}

/** @param {import("postgres").Sql} sql */
export async function importCatalog(sql, { force = false } = {}) {
  const [settings] = await sql`select catalog_imported_at from settings where id = 1`;
  const [{ count }] = await sql`select count(*)::int as count from products`;
  if (!force) {
    if (settings?.catalog_imported_at) return;
    if (count > 0) {
      await sql`update settings set catalog_imported_at = now() where id = 1`;
      return;
    }
  }
  const catalog = JSON.parse(await readFile(path.join(DIR, "catalog.json"), "utf8"));
  const existingRefs = new Set((await sql`select reference from products`).map((r) => r.reference));
  const pending = catalog.products.filter((p) => !existingRefs.has(p.ref));
  if (!pending.length) {
    console.log("✔ Catálogo: no hay productos nuevos para importar");
    await sql`update settings set catalog_imported_at = coalesce(catalog_imported_at, now()) where id = 1`;
    return;
  }

  // 1) Fotos (fuera de la transacción: subir archivos puede tardar).
  const names = new Set(pending.flatMap((p) => p.images.map(([n]) => n)));
  for (const c of catalog.collections) names.add(c.image);
  names.add("essential-vino");
  names.add("essential-crema");
  const images = {};
  for (const n of names) images[n] = await storeImage(n);

  // 2) Datos, todo o nada.
  await sql.begin(async (tx) => {
    const colorIds = {};
    for (const [name, hex] of Object.entries(catalog.colors)) {
      const [row] = await tx`insert into colors (name, hex) values (${name}, ${hex})
        on conflict (name) do update set name = excluded.name returning id`;
      colorIds[name] = row.id;
    }
    const categoryIds = {};
    for (const [i, name] of catalog.categories.entries()) {
      const [row] = await tx`insert into categories (slug, name, sort_order) values (${slugify(name)}, ${name}, ${i})
        on conflict (slug) do update set name = categories.name returning id`;
      categoryIds[name] = row.id;
    }
    const collectionIds = {};
    for (const [i, c] of catalog.collections.entries()) {
      const [row] = await tx`insert into collections (slug, name, description, image_url, sort_order, is_featured)
        values (${c.slug}, ${c.name}, ${c.description}, ${images[c.image].url}, ${i}, ${!!c.featured})
        on conflict (slug) do update set slug = collections.slug returning id`;
      collectionIds[c.slug] = row.id;
    }

    for (const p of pending) {
      const sortOrder = catalog.products.indexOf(p);
      const description = [p.tagline, p.description ?? catalog.pvc].filter(Boolean).join("\n\n");
      const details = [
        p.measures && `Medidas: ${p.measures}`,
        p.material !== undefined ? p.material && `Material: ${p.material}` : "Material: PVC (cuero vegano).",
        p.includes,
      ]
        .filter(Boolean)
        .join("\n\n");
      const pers = p.initials
        ? { label: catalog.initials.label, max: catalog.initials.max, note: catalog.initials.note, options: [] }
        : p.personalization ?? null;
      const options = (pers?.options ?? []).map((o) => ({
        label: o.label,
        choices: o.choices.map((name) => ({ name, price: 0, hex: catalog.colors[name] })),
      }));

      const [prod] = await tx`insert into products
        (slug, reference, name, collection_id, category_id, description, details, price, is_featured, sort_order,
         personalization_enabled, personalization_label, personalization_max_chars, personalization_price,
         personalization_charset, personalization_options, personalization_note, mto_min_days, mto_max_days)
        values (${p.slug}, ${p.ref}, ${p.name}, ${collectionIds[p.collection] ?? null}, ${categoryIds[p.category] ?? null},
         ${description}, ${details}, ${p.price}, ${!!p.featured}, ${sortOrder},
         ${!!pers}, ${pers?.label ?? "Iniciales o nombre"}, ${pers?.max ?? 3}, 0,
         'letters', ${JSON.stringify(options)}::jsonb, ${pers?.note ?? ""}, ${p.mtoDays?.[0] ?? null}, ${p.mtoDays?.[1] ?? null})
        returning id`;

      // Disponibilidad inicial: sin inventario cargado → «Bajo pedido» hasta que la tienda registre unidades.
      const variantIds = {};
      for (const [j, color] of p.colors.entries()) {
        if (!colorIds[color]) throw new Error(`Color desconocido en ${p.ref}: ${color}`);
        const [v] = await tx`insert into product_variants (product_id, color_id, status, stock, allow_made_to_order, sort_order)
          values (${prod.id}, ${colorIds[color]}, 'in_stock', 0, true, ${j}) returning id`;
        variantIds[color] = v.id;
      }
      for (const [k, [img, color]] of p.images.entries()) {
        const im = images[img];
        const alt = color ? `${p.name} color ${color.toLowerCase()}` : p.name;
        await tx`insert into product_images (product_id, variant_id, url, alt, width, height, sort_order)
          values (${prod.id}, ${color ? variantIds[color] ?? null : null}, ${im.url}, ${alt}, ${im.width}, ${im.height}, ${k})`;
      }
    }

    const allNames = catalog.products.flatMap((p) => p.images.map(([n]) => n));
    await tx`update settings set
      catalog_images_applied = ${allNames},
      catalog_imported_at = now(),
      hero_image_url = coalesce(hero_image_url, ${images["essential-vino"].url}),
      editorial_image_url = coalesce(editorial_image_url, ${images["essential-crema"].url})
      where id = 1`;
  });
  console.log(`✔ Catálogo importado: ${pending.length} productos con sus fotos`);
}

/**
 * Fotos nuevas agregadas a catalog.json después de la primera importación:
 * se suben y se colocan al principio de la galería del producto, una sola vez.
 * Si la propietaria borra una foto, no vuelve a aparecer.
 * @param {import("postgres").Sql} sql
 */
export async function syncCatalogImages(sql) {
  const [settings] = await sql`select catalog_imported_at, catalog_images_applied from settings where id = 1`;
  if (!settings?.catalog_imported_at) return;
  const catalog = JSON.parse(await readFile(path.join(DIR, "catalog.json"), "utf8"));
  let applied = new Set(settings.catalog_images_applied ?? []);

  // Tiendas importadas antes de existir este registro: se consideran aplicadas las fotos que ya están en uso.
  if (applied.size === 0) {
    const used = await sql`select url from product_images union select image_url from collections where image_url is not null`;
    for (const { url } of used) {
      const m = url.match(/catalogo[-/]([a-z0-9-]+?)(?:-[A-Za-z0-9]{20,})?\.webp$/);
      if (m) applied.add(m[1]);
    }
  }

  const products = await sql`select id, reference from products`;
  const byRef = new Map(products.map((p) => [p.reference, p.id]));
  let added = 0;
  for (const p of catalog.products) {
    const productId = byRef.get(p.ref);
    const fresh = p.images.map(([n, c], i) => ({ n, c, i })).filter(({ n }) => !applied.has(n));
    if (!fresh.length) continue;
    if (!productId) {
      fresh.forEach(({ n }) => applied.add(n));
      continue;
    }
    const variants = await sql`select v.id, c.name from product_variants v join colors c on c.id = v.color_id where v.product_id = ${productId}`;
    for (const { n, c, i } of fresh) {
      const im = await storeImage(n);
      const variantId = c ? variants.find((v) => v.name === c)?.id ?? null : null;
      const alt = c ? `${p.name} color ${c.toLowerCase()}` : p.name;
      await sql`insert into product_images (product_id, variant_id, url, alt, width, height, sort_order)
        values (${productId}, ${variantId}, ${im.url}, ${alt}, ${im.width}, ${im.height}, ${i - 1000})`;
      applied.add(n);
      added++;
    }
  }
  await sql`update settings set catalog_images_applied = ${[...applied]} where id = 1`;
  if (added) console.log(`✔ Catálogo: ${added} foto(s) nueva(s) agregada(s)`);
}

// Ejecución manual: npm run db:catalog
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const { default: postgres } = await import("postgres");
  await import("dotenv/config");
  const sql = postgres(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
  try {
    await importCatalog(sql, { force: true });
    await syncCatalogImages(sql);
  } finally {
    await sql.end();
  }
}
