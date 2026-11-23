// Aplica las migraciones de la base de datos y prepara los datos mínimos.
// Se ejecuta automáticamente en cada despliegue (npm run build).
// Es seguro ejecutarlo varias veces: no borra ni sobrescribe información existente.
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import bcrypt from "bcryptjs";
import { importCatalog, syncCatalogImages } from "./import-catalog.mjs";

// Para migrar se prefiere la conexión directa de Neon (sin pooler) si existe.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("✖ Falta DATABASE_URL. Conecta la base de datos (Neon) en Vercel → Storage.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

try {
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("✔ Migraciones aplicadas");

  // Configuración inicial (solo si no existe). Textos provisionales: se editan en Panel → Ajustes.
  await sql`
    insert into settings (
      id, store_name, hero_eyebrow, hero_title, hero_subtitle, hero_cta_label,
      editorial_title, editorial_body, about_title, about_body,
      shipping_text, made_to_order_text, returns_text, contact_text, seo_description
    ) values (
      1,
      'Dosha Bags',
      'Nueva temporada',
      'Bolsos que acompañan tu historia',
      'Diseños atemporales, pensados para el día a día y hechos con detalle.',
      'Ver la colección',
      'Hecho con intención',
      'Cada bolso se piensa para durar y acompañarte. Si el color que buscas no está disponible, lo fabricamos por encargo en pocos días.',
      'Sobre Dosha Bags',
      ${"Dosha Bags es una marca colombiana de bolsos.\n\n[Texto provisional] Cuéntale aquí a tus clientas la historia de la marca, cómo nació y qué la hace especial. Puedes editarlo desde Panel → Ajustes → Nosotros."},
      ${"Realizamos envíos a toda Colombia. El costo y el tiempo de transporte dependen de la ciudad de destino y se confirman por WhatsApp antes del pago.\n\n[Texto provisional] Ajusta esta información desde Panel → Ajustes → Información."},
      ${"Algunos bolsos se fabrican por encargo. El tiempo de fabricación es de 3 a 5 días hábiles y empieza a contar cuando se confirma el pedido. Este plazo no incluye el tiempo de transporte."},
      ${"[Texto provisional] Describe aquí tu política de cambios y devoluciones: plazos, condiciones del producto y cómo solicitarlos. Los productos personalizados normalmente no admiten devolución."},
      ${"Escríbenos por WhatsApp o Instagram. Te respondemos lo antes posible."},
      'Bolsos colombianos de diseño atemporal. Pide por WhatsApp, elige tu color y personalízalo.'
    ) on conflict (id) do nothing`;
  console.log("✔ Configuración inicial verificada");

  // Primera administradora (solo si no existe ninguna).
  const [{ count }] = await sql`select count(*)::int as count from admin_users`;
  if (count === 0) {
    const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const password = process.env.ADMIN_INITIAL_PASSWORD ?? "";
    if (email && password.length >= 10) {
      const hash = await bcrypt.hash(password, 12);
      await sql`insert into admin_users (email, name, password_hash) values (${email}, 'Administradora', ${hash})`;
      console.log(`✔ Cuenta administradora creada para ${email}`);
    } else {
      console.warn(
        "⚠ No hay cuentas administradoras. Define ADMIN_EMAIL y ADMIN_INITIAL_PASSWORD (mínimo 10 caracteres) y vuelve a desplegar.",
      );
    }
  }

  // Catálogo real de Dosha Bags: se carga solo la primera vez (tienda sin productos).
  await importCatalog(sql);
  await syncCatalogImages(sql);

  // Limpieza ligera de sesiones vencidas e intentos de acceso antiguos.
  await sql`delete from admin_sessions where expires_at < now()`;
  await sql`delete from login_attempts where created_at < now() - interval '1 day'`;
} catch (err) {
  console.error("✖ Error preparando la base de datos:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
