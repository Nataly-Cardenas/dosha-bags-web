// Crea productos DE EJEMPLO (referencias DEMO-xx) para probar la tienda en local.
// NO son productos reales de Dosha Bags. Uso:
//   npm run db:demo            → crea/actualiza los ejemplos
//   npm run db:demo -- --clean → elimina los ejemplos
import "dotenv/config";
import postgres from "postgres";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "";
if (!/localhost|127\.0\.0\.1/.test(url) && !process.argv.includes("--force")) {
  console.error("✖ Por seguridad, los datos de ejemplo solo se cargan en una base de datos local.");
  process.exit(1);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });

async function clean() {
  await sql`delete from products where reference like 'DEMO-%'`;
  await sql`delete from collections where slug like 'ejemplo-%'`;
  await sql`delete from colors c where not exists (select 1 from product_variants v where v.color_id = c.id) and c.name in ('Cranberry','Plum','Taupe','Negro','Arena','Marfil')`;
  console.log("✔ Datos de ejemplo eliminados");
}

const COLORS = {
  Cranberry: "#3F1116",
  Plum: "#64343C",
  Taupe: "#9D7960",
  Negro: "#1E1A1A",
  Arena: "#D9C3A5",
  Marfil: "#F4EBDD",
};

// Ilustración neutra de un bolso (no es una fotografía real del producto).
function bagSvg(hex, shape, angle = 0) {
  const bg = "#F3E5DA";
  const shapes = {
    hobo: `<path d="M260 520 Q250 330 400 300 Q550 330 540 520 Q520 700 400 705 Q280 700 260 520Z" fill="${hex}"/>
           <path d="M300 330 Q400 80 500 330" stroke="${hex}" stroke-width="22" fill="none"/>
           <rect x="385" y="420" width="30" height="46" rx="3" fill="#C2A15A"/>`,
    tote: `<path d="M220 360 L580 360 L610 720 L190 720Z" fill="${hex}"/>
           <path d="M300 370 Q300 210 400 210 Q500 210 500 370" stroke="${hex}" stroke-width="20" fill="none"/>`,
    estuche: `<rect x="200" y="400" width="400" height="250" rx="40" fill="${hex}"/>
           <path d="M220 430 L580 430" stroke="#C2A15A" stroke-width="6"/>
           <circle cx="580" cy="430" r="12" fill="#C2A15A"/>`,
    mano: `<path d="M230 420 L570 420 L560 680 L240 680Z" fill="${hex}"/>
           <path d="M230 420 L400 540 L570 420" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="4"/>
           <path d="M320 425 Q400 300 480 425" stroke="${hex}" stroke-width="16" fill="none"/>`,
    monedero: `<rect x="270" y="440" width="260" height="180" rx="18" fill="${hex}"/>
           <path d="M270 500 L530 500" stroke="rgba(0,0,0,.18)" stroke-width="4"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
    <rect width="800" height="1000" fill="${bg}"/>
    <ellipse cx="400" cy="760" rx="230" ry="18" fill="rgba(63,17,22,.10)"/>
    <g transform="rotate(${angle} 400 500)">${shapes[shape]}</g>
    <text x="400" y="900" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#9D7960" letter-spacing="6">IMAGEN DE EJEMPLO</text>
  </svg>`;
}

async function writeImage(name, svg) {
  const dir = path.join(process.cwd(), ".uploads", "productos");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), await sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer());
  return `/api/uploads/productos/${name}`;
}

async function seed() {
  await clean();
  const colorIds = {};
  for (const [name, hex] of Object.entries(COLORS)) {
    const [row] = await sql`insert into colors (name, hex) values (${name}, ${hex})
      on conflict (name) do update set hex = excluded.hex returning id`;
    colorIds[name] = row.id;
  }
  const cats = {};
  for (const [i, [slug, name]] of [["bolsos", "Bolsos"], ["estuches", "Estuches"], ["accesorios", "Accesorios"]].entries()) {
    const [row] = await sql`insert into categories (slug, name, sort_order) values (${slug}, ${name}, ${i})
      on conflict (slug) do update set name = excluded.name returning id`;
    cats[slug] = row.id;
  }
  const colImg1 = await writeImage("demo-col-1.webp", bagSvg(COLORS.Cranberry, "hobo", -6));
  const colImg2 = await writeImage("demo-col-2.webp", bagSvg(COLORS.Taupe, "tote", 4));
  const [c1] = await sql`insert into collections (slug, name, description, image_url, sort_order, is_featured)
    values ('ejemplo-esencial', 'Esencial (ejemplo)', 'Colección de ejemplo para probar la tienda. Reemplázala por una colección real.', ${colImg1}, 0, true) returning id`;
  const [c2] = await sql`insert into collections (slug, name, description, image_url, sort_order, is_featured)
    values ('ejemplo-viaje', 'Viaje (ejemplo)', 'Segunda colección de ejemplo.', ${colImg2}, 1, true) returning id`;

  const letters = [
    { label: "Color de las letras", choices: [{ name: "Dorado", price: 0, hex: "#B8913F" }, { name: "Plateado", price: 5000, hex: "#9A9A9A" }] },
  ];

  const products = [
    {
      ref: "DEMO-01", slug: "ejemplo-bolso-hobo", name: "Bolso hobo (ejemplo)", shape: "hobo", col: c1.id, cat: cats.bolsos, price: 289000,
      featured: true, isNew: true,
      desc: "Producto de ejemplo para probar la tienda. Aquí irá la descripción real del bolso: silueta, uso y detalles que lo hacen especial.",
      details: "Material: [por definir]\nMedidas: [por definir]\nHerrajes: [por definir]",
      care: "Limpiar con un paño seco. Evitar la exposición prolongada al sol.",
      pers: { enabled: true, label: "Iniciales", max: 3, price: 15000, charset: "letters", options: letters, note: "Los productos personalizados no admiten cambios." },
      variants: [
        { color: "Cranberry", status: "in_stock", stock: 2, mto: true },
        { color: "Taupe", status: "made_to_order", stock: 0, mto: true },
        { color: "Negro", status: "unavailable", stock: 0, mto: false },
      ],
    },
    {
      ref: "DEMO-02", slug: "ejemplo-bolso-tote", name: "Bolso tote (ejemplo)", shape: "tote", col: c2.id, cat: cats.bolsos, price: 349000,
      featured: true,
      desc: "Tote de ejemplo, amplio para el día a día. Texto provisional.",
      details: "Medidas: [por definir]",
      variants: [
        { color: "Arena", status: "in_stock", stock: 1, mto: true },
        { color: "Plum", status: "in_stock", stock: 3, mto: true, price: 369000 },
      ],
    },
    {
      ref: "DEMO-03", slug: "ejemplo-estuche", name: "Estuche cosmetiquera (ejemplo)", shape: "estuche", col: c2.id, cat: cats.estuches, price: 89000,
      featured: true,
      desc: "Estuche de ejemplo personalizable con nombre.",
      pers: { enabled: true, label: "Nombre", max: 10, price: 10000, charset: "letters", options: [], note: "" },
      variants: [
        { color: "Marfil", status: "made_to_order", stock: 0, mto: true },
        { color: "Taupe", status: "made_to_order", stock: 0, mto: true },
        { color: "Cranberry", status: "made_to_order", stock: 0, mto: true },
      ],
    },
    {
      ref: "DEMO-04", slug: "ejemplo-bolso-de-mano", name: "Bolso de mano (ejemplo)", shape: "mano", col: c1.id, cat: cats.bolsos, price: 199000,
      featured: true,
      desc: "Bolso de mano de ejemplo. Texto provisional.",
      variants: [
        { color: "Negro", status: "in_stock", stock: 4, mto: false },
        { color: "Cranberry", status: "in_stock", stock: 1, mto: false },
      ],
    },
    {
      ref: "DEMO-05", slug: "ejemplo-monedero", name: "Monedero (ejemplo)", shape: "monedero", col: c1.id, cat: cats.accesorios, price: 59000,
      desc: "Monedero de ejemplo, agotado sin opción de encargo.",
      variants: [{ color: "Plum", status: "in_stock", stock: 0, mto: false }],
    },
  ];

  for (const [i, p] of products.entries()) {
    const pers = p.pers ?? { enabled: false, label: "Iniciales o nombre", max: 3, price: 0, charset: "letters", options: [], note: "" };
    const [row] = await sql`insert into products
      (slug, reference, name, collection_id, category_id, description, details, care, price, is_featured, is_new, sort_order,
       personalization_enabled, personalization_label, personalization_max_chars, personalization_price,
       personalization_charset, personalization_options, personalization_note)
      values (${p.slug}, ${p.ref}, ${p.name}, ${p.col}, ${p.cat}, ${p.desc}, ${p.details ?? ""}, ${p.care ?? ""}, ${p.price},
       ${!!p.featured}, ${!!p.isNew}, ${i}, ${pers.enabled}, ${pers.label}, ${pers.max}, ${pers.price}, ${pers.charset},
       ${sql.json(pers.options)}, ${pers.note})
      returning id`;
    let sort = 0;
    for (const [j, v] of p.variants.entries()) {
      const [vr] = await sql`insert into product_variants (product_id, color_id, status, stock, allow_made_to_order, price_override, sort_order)
        values (${row.id}, ${colorIds[v.color]}, ${v.status}, ${v.stock}, ${v.mto}, ${v.price ?? null}, ${j}) returning id`;
      for (const angle of [0, -8]) {
        const file = `demo-${p.ref.toLowerCase()}-${v.color.toLowerCase()}-${angle ? "b" : "a"}.webp`;
        const img = await writeImage(file, bagSvg(COLORS[v.color], p.shape, angle));
        await sql`insert into product_images (product_id, variant_id, url, alt, width, height, sort_order)
          values (${row.id}, ${vr.id}, ${img}, ${`${p.name} en color ${v.color}`}, 800, 1000, ${sort++})`;
      }
    }
  }

  await sql`update settings set whatsapp_number = case when whatsapp_number = '' then '573000000000' else whatsapp_number end,
    announcement = case when announcement = '' then 'Tienda en preparación · productos de ejemplo' else announcement end
    where id = 1`;
  console.log(`✔ ${products.length} productos de ejemplo creados (referencias DEMO-01 a DEMO-0${products.length})`);
  console.log("  WhatsApp de prueba: 573000000000 (cámbialo en Panel → Ajustes)");
}

try {
  if (process.argv.includes("--clean")) await clean();
  else await seed();
} finally {
  await sql.end();
}
