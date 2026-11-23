# Dosha Bags · Tienda online

Tienda online de Dosha Bags con catálogo administrable, carrito, fabricación bajo pedido,
personalización y finalización de pedidos por WhatsApp.

- **Guía para publicar la web (paso a paso, sin conocimientos técnicos):** [`docs/PUBLICAR.md`](docs/PUBLICAR.md)
- **Manual de la propietaria (uso del panel):** [`docs/MANUAL-PANEL.md`](docs/MANUAL-PANEL.md)

## Tecnología

| Pieza | Elección | Por qué |
| --- | --- | --- |
| Aplicación | Next.js 16 (App Router) + TypeScript | Tienda y panel en un solo proyecto; páginas en caché y rápidas en celular. |
| Estilos | Tailwind CSS 4 | Sistema de diseño con la paleta de la marca en `src/app/globals.css`. |
| Base de datos | PostgreSQL (Neon) + Drizzle ORM | Persistente, gratuita en su plan inicial, se conecta desde Vercel con un clic. |
| Fotos | Vercel Blob (+ `sharp`) | Las fotos se reducen en el navegador, se optimizan a WebP y se sirven por CDN. |
| Autenticación | Propia (bcrypt + sesiones en BD + cookie HttpOnly) | Sin servicios extra; límite de intentos; varias administradoras. |
| Publicación | Vercel | Despliegue automático desde GitHub. |

Tipografías: Cormorant Garamond (titulares, editorial) y Jost (texto e interfaz), autoalojadas con Fontsource.

## Estructura

```
src/
  app/(store)/        Páginas públicas: inicio, tienda, colecciones, producto, carrito, nosotros, información
  app/admin/          Panel privado (login + (panel)/…) y acciones del servidor (actions.ts)
  app/actions/cart.ts Cálculo del carrito y registro de la solicitud (WhatsApp)
  components/store/   Componentes de la tienda
  components/admin/   Componentes del panel
  db/schema.ts        Esquema de la base de datos
  lib/commerce.ts     Reglas de negocio puras (disponibilidad, personalización, mensaje de WhatsApp) + pruebas
  lib/quote.ts        Recalcula precios y disponibilidad en el servidor
  lib/catalog.ts      Consultas del catálogo público
  lib/auth.ts         Sesiones y protección del panel
  lib/storage.ts      Subida y borrado de fotos
drizzle/              Migraciones SQL
scripts/migrate.mjs   Aplica migraciones, crea la configuración y la primera administradora (se ejecuta en cada build)
scripts/import-catalog.mjs Importa el catálogo real (catalog-import/) la primera vez que la tienda está vacía
scripts/crop-catalog.mjs   Herramienta usada para recortar las fotos del PDF del catálogo
scripts/seed-demo.mjs Productos DE EJEMPLO para desarrollo local (DEMO-01…05), ya no necesarios
catalog-import/       catalog.json (19 productos del catálogo PDF) y sus fotos
scripts/e2e.mjs       Prueba de extremo a extremo con navegador real
```

## Reglas de negocio clave

- **Disponibilidad por color** (`availabilityOf`): `in_stock` con unidades → entrega inmediata; sin unidades → bajo pedido si
  «Permitir encargo» está activo, si no → no disponible; `made_to_order` → siempre bajo pedido; `unavailable` → no disponible.
  Si se piden más unidades de las que hay, se reparten (p. ej. 1 inmediata + 1 bajo pedido).
- **Plazo de fabricación**: 3–5 días hábiles por defecto, editable en Ajustes; cada producto puede tener su propio plazo
  (Siena y Victoria: 5–8, según el catálogo). Siempre se comunica separado del envío.
- **Catálogo inicial**: en el primer despliegue con la base vacía, `migrate.mjs` importa `catalog-import/catalog.json`
  y sube sus fotos a Blob. Queda registrado en `settings.catalog_imported_at` y no se repite.
  `npm run db:catalog` agrega manualmente productos del archivo cuya referencia no exista.
- **Precios fiables**: el navegador solo guarda IDs, cantidades y el texto de personalización. El servidor recalcula
  precios, extras de personalización y disponibilidad desde la base de datos en cada vista del carrito y al finalizar.
- **WhatsApp**: el servidor genera el mensaje y el enlace `wa.me` (codificado con `encodeURIComponent`). La solicitud se registra
  como «Pendiente de confirmar»; nunca se marca como pagada ni confirmada automáticamente. Abrir WhatsApp no descuenta inventario.
- **Cambios del panel**: cada guardado llama a `revalidatePath("/", "layout")`, así la tienda se actualiza sin redesplegar.

## Desarrollo local

Requisitos: Node 20+ y PostgreSQL.

```bash
cp .env.example .env      # y ajusta DATABASE_URL, ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD
npm install
npm run db:migrate        # crea tablas, configuración y la primera administradora
                          # …y la primera vez importa el catálogo real (19 productos)
npm run dev               # http://localhost:3000  ·  panel: http://localhost:3000/admin
```

Sin `BLOB_READ_WRITE_TOKEN`, las fotos se guardan en `.uploads/` (solo desarrollo).

### Pruebas

```bash
npm run lint              # comprobación de tipos
npm test                  # pruebas unitarias de reglas de negocio (13)
npm run e2e               # con el servidor en marcha y el catálogo real cargado (29 pasos)
```

### Cambiar el esquema de la base de datos

1. Edita `src/db/schema.ts`.
2. `npm run db:generate` crea la migración en `drizzle/`.
3. Haz commit; el siguiente despliegue la aplica automáticamente.
