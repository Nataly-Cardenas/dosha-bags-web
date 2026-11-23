// Prueba de extremo a extremo de los flujos principales.
// Requiere: servidor en marcha (npm run dev o npm start), datos de ejemplo (npm run db:demo)
// y las credenciales de .env (ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD).
//   BASE_URL=http://localhost:3000 npm run e2e
import "dotenv/config";
import { createRequire } from "node:module";
import sharp from "sharp";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_INITIAL_PASSWORD;
const SHOTS = process.env.SHOTS_DIR;

let passed = 0;
const failures = [];
async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (e) {
    failures.push(name);
    if (SHOTS && globalThis.__page) await globalThis.__page.screenshot({ path: path.join(SHOTS, `fallo-${failures.length}.png`), fullPage: true }).catch(() => {});
    console.log(`  ✖ ${name}\n      ${String(e?.message ?? e).split("\n")[0]}`);
  }
}
function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}
const shot = async (page, name) => SHOTS && page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

const tmp = await mkdtemp(path.join(tmpdir(), "dosha-e2e-"));
const photo = path.join(tmp, "foto.png");
// Foto "de celular" grande (3000×4000) para probar compresión y subida.
await writeFile(
  photo,
  await sharp({ create: { width: 3000, height: 4000, channels: 3, background: { r: 100, g: 52, b: 60 } } })
    .composite([{ input: Buffer.from('<svg width="3000" height="4000"><circle cx="1500" cy="2000" r="900" fill="#FFF1E9"/></svg>') }])
    .png({ compressionLevel: 0 })
    .toBuffer(),
);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);
globalThis.__page = page;
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const NAME = "Bolso Prueba E2E";
const SLUG = "bolso-prueba-e2e";
let productUrl = "";
let createdColor = "";

console.log("\nSeguridad del panel");
await step("El panel redirige al inicio de sesión sin sesión", async () => {
  await page.goto(`${BASE}/admin/productos`);
  expect(page.url().endsWith("/admin/login"), `URL: ${page.url()}`);
});
await step("Contraseña incorrecta es rechazada", async () => {
  await page.fill("#email", EMAIL);
  await page.fill("#password", "incorrecta-123456");
  await page.click("button:has-text('Ingresar')");
  await page.getByText("Correo o contraseña incorrectos").waitFor();
});
await step("Inicio de sesión correcto", async () => {
  await page.fill("#password", PASSWORD);
  await page.click("button:has-text('Ingresar')");
  await page.waitForURL(`${BASE}/admin`);
  await page.getByRole("heading", { name: "Resumen" }).waitFor();
  await shot(page, "admin-resumen");
});
await step("La cookie de sesión es HttpOnly", async () => {
  const c = (await ctx.cookies()).find((c) => c.name === "dosha_admin");
  expect(c && c.httpOnly && c.sameSite === "Lax", "cookie insegura");
});

console.log("\nCrear producto desde el panel");
await step("Limpiar restos de pruebas anteriores", async () => {
  await page.goto(`${BASE}/admin/productos`);
  page.on("dialog", (d) => d.accept());
  while (await page.getByText(NAME, { exact: false }).count()) {
    const row = page.locator("li", { hasText: NAME }).first();
    await row.locator("summary:has-text('Más')").click();
    await row.getByRole("button", { name: "Eliminar" }).click();
    await page.waitForTimeout(800);
    await page.reload();
  }
});
await step("Formulario de nuevo producto con color nuevo, foto y personalización", async () => {
  await page.goto(`${BASE}/admin/productos/nuevo`);
  await page.fill("#p-name", NAME);
  await page.fill("#p-ref", "E2E-01");
  await page.fill("#p-price", "150000");
  await page.selectOption("#p-col", { label: "Esencial (ejemplo)" });
  await page.fill("#p-desc", "Descripción de prueba.\n\nSegundo párrafo.");
  // Color nuevo creado en línea
  const variant = page.locator("li", { hasText: "Color 1" }).first();
  const colorName = `Verde E2E ${Date.now() % 10000}`;
  await variant.locator("select").first().selectOption("__new");
  await variant.getByPlaceholder("Nombre, ej.: Vino").fill(colorName);
  await variant.getByRole("button", { name: "Guardar color" }).click();
  await page.getByText(colorName).first().waitFor();
  await page.locator("li", { hasText: colorName }).first().getByLabel("Unidades en inventario").fill("1");
  createdColor = colorName;
  // Foto
  await page.locator('input[type="file"][multiple]').setInputFiles(photo);
  await page.getByText("Principal").waitFor({ timeout: 20000 });
  // Personalización
  await page.getByRole("switch", { name: "Este producto se puede personalizar" }).click();
  await page.getByLabel("Máximo de caracteres").fill("3");
  await page.getByLabel("Costo adicional (COP)").fill("10000");
  await shot(page, "admin-nuevo-producto");
  await page.getByRole("button", { name: "Crear producto" }).click();
  await page.waitForURL(/\/admin\/productos\/[0-9a-f-]+\?creado=1/, { timeout: 15000 });
  await page.getByText("Producto creado").waitFor();
  productUrl = page.url().split("?")[0];
});

console.log("\nTienda pública refleja el cambio sin desplegar");
await step("El producto aparece en la tienda con precio, foto y color", async () => {
  await page.goto(`${BASE}/producto/${SLUG}`);
  await page.getByRole("heading", { name: NAME }).waitFor();
  expect(await page.getByText("$150.000").count(), "precio no visible");
  expect((await page.locator("main img").count()) > 0, "sin foto");
  await page.getByText("Disponible para entrega inmediata").waitFor();
});
await step("Búsqueda en la tienda encuentra el producto", async () => {
  await page.goto(`${BASE}/tienda?q=prueba e2e`);
  await page.getByRole("heading", { name: NAME }).waitFor();
  expect((await page.locator("article").count()) === 1, "la búsqueda debería devolver 1 producto");
});
await step("Filtro por disponibilidad «bajo pedido» incluye el estuche de ejemplo", async () => {
  await page.goto(`${BASE}/tienda?disponibilidad=encargo`);
  await page.getByRole("heading", { name: "Estuche cosmetiquera (ejemplo)" }).waitFor();
});

console.log("\nCarrito: personalización, encargo y varias líneas");
await step("Personalización inválida muestra error y no se agrega", async () => {
  await page.goto(`${BASE}/producto/${SLUG}`);
  await page.getByLabel("Personalizar").check().catch(async () => page.getByText("Personalizar").click());
  await page.fill("#pers-text", "A1");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await page.getByRole("alert").filter({ hasText: "Caracteres permitidos" }).waitFor();
});
await step("Cantidad 2 con 1 en inventario → 1 inmediata + 1 bajo pedido", async () => {
  await page.fill("#pers-text", "AB");
  await page.getByText("Vista previa ilustrativa").waitFor();
  await page.getByRole("button", { name: "Aumentar cantidad" }).click();
  await page.getByText("1 se fabricarían bajo pedido").waitFor();
  expect(await page.getByText("$160.000").count(), "precio con personalización (150.000 + 10.000) no visible");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await page.getByText("Agregado al carrito").waitFor();
});
await step("Estuche bajo pedido con nombre", async () => {
  await page.goto(`${BASE}/producto/ejemplo-estuche`);
  await page.getByText("Disponible bajo pedido").waitFor();
  await page.getByText("Personalizar").click();
  await page.fill("#pers-text", "Ana");
  await page.getByRole("button", { name: "Encargar este bolso" }).click();
  await page.getByText("Agregado al carrito").waitFor();
});
await step("El carrito calcula el total en el servidor: 2×160.000 + 99.000 = $419.000", async () => {
  await page.goto(`${BASE}/carrito`);
  await page.getByText("$419.000").first().waitFor();
  await page.getByText("1 inmediata(s) · 1 bajo pedido").waitFor();
  await page.getByText("Tu pedido incluye productos").waitFor();
  await shot(page, "carrito-escritorio");
});
await step("El carrito persiste al recargar", async () => {
  await page.reload();
  await page.getByText("$419.000").first().waitFor();
});
await step("Precio manipulado en el navegador no tiene efecto (el navegador no guarda precios)", async () => {
  const stored = await page.evaluate(() => localStorage.getItem("dosha-cart-v1"));
  expect(stored && !stored.includes("160000") && !stored.includes("price"), "el carrito guarda precios en el navegador");
});

console.log("\nFinalizar por WhatsApp");
let message = "";
await step("Abre wa.me con el mensaje completo y codificado", async () => {
  await page.fill("#c-name", "Laura Prueba");
  await page.fill("#c-city", "Medellín");
  const [popup] = await Promise.all([
    ctx.waitForEvent("page"),
    page.getByRole("button", { name: "Finalizar pedido por WhatsApp" }).click(),
  ]);
  await popup.waitForURL(/wa\.me|api\.whatsapp\.com|whatsapp/, { timeout: 15000 }).catch(() => {});
  // wa.me puede redirigir; leemos la URL original del enlace de respaldo en la página.
  const href = await page.getByRole("link", { name: "Abrir WhatsApp de nuevo" }).getAttribute("href");
  await popup.close();
  expect(href.startsWith("https://wa.me/573000000000?text="), `URL: ${href}`);
  message = decodeURIComponent(href.split("text=")[1]);
  for (const s of [
    "Hola, Dosha Bags. Me gustaría realizar el siguiente pedido:",
    `1. ${NAME} (Ref. E2E-01)`,
    'Personalización: "AB"',
    "Disponibilidad: 1 para entrega inmediata y 1 bajo pedido (fabricación 3-5 días hábiles)",
    "2. Estuche cosmetiquera (ejemplo) (Ref. DEMO-03)",
    'Personalización: "Ana"',
    "Disponibilidad: Fabricación bajo pedido (3-5 días hábiles)",
    "Precio unitario: $160.000",
    "Subtotal: $320.000",
    "TOTAL: $419.000 COP",
    "Nombre: Laura Prueba",
    "Ciudad: Medellín",
    "Quedo pendiente de confirmar disponibilidad, envío y forma de pago. ¡Gracias!",
  ]) {
    expect(message.includes(s), `falta en el mensaje: ${s}`);
  }
  await shot(page, "carrito-enviado");
});
await step("La solicitud queda «Pendiente de confirmar» en el panel (no pagada)", async () => {
  const code = message.match(/Solicitud: (DB-\d+)/)?.[1];
  expect(code, "sin código de solicitud");
  await page.goto(`${BASE}/admin/pedidos`);
  const row = page.locator("li", { hasText: code });
  await row.locator("summary").getByText("Pendiente de confirmar").waitFor();
  await row.getByText("Laura Prueba").waitFor();
});
await step("Vaciar carrito después de enviar", async () => {
  await page.goto(`${BASE}/carrito`);
  // Tras navegar, la pantalla de confirmación ya no está; el carrito sigue para reenviar si hace falta.
  await page.getByText("$419.000").first().waitFor();
  await page.evaluate(() => localStorage.removeItem("dosha-cart-v1"));
  await page.reload();
  await page.getByText("Tu carrito está vacío").waitFor();
});

console.log("\nCambios del panel visibles al instante");
await step("Cambiar precio en el panel actualiza la tienda", async () => {
  await page.goto(productUrl);
  await page.fill("#p-price", "175000");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.getByText("Cambios guardados").waitFor();
  await page.goto(`${BASE}/producto/${SLUG}`);
  await page.getByText("$175.000").first().waitFor();
});
await step("Inventario: sin unidades y sin encargo → «Temporalmente no disponible»", async () => {
  await page.goto(`${BASE}/admin/inventario`);
  const row = page.locator("li", { hasText: NAME });
  await row.getByLabel("Unidades").fill("0");
  await row.getByText("Encargo al agotarse").click();
  await row.getByRole("button", { name: "Guardar" }).click();
  await row.getByText("Guardado").waitFor();
  await page.goto(`${BASE}/producto/${SLUG}`);
  await page.getByText("Temporalmente no disponible en este color").waitFor();
  expect(await page.getByRole("button", { name: "No disponible por ahora" }).isDisabled(), "botón activo");
});
await step("Ocultar producto lo retira de la tienda", async () => {
  await page.goto(`${BASE}/admin/productos`);
  await page.locator("li", { hasText: NAME }).getByRole("button", { name: "Ocultar" }).click();
  await page.locator("li", { hasText: NAME }).getByText("Oculto").waitFor();
  const res = await page.goto(`${BASE}/producto/${SLUG}`);
  expect(res.status() === 404, `estado ${res.status()}`);
});
await step("Un carrito con un producto oculto bloquea el envío con mensaje claro", async () => {
  const id = productUrl.split("/").pop();
  await page.goto(`${BASE}/carrito`);
  await page.evaluate((id) => {
    localStorage.setItem("dosha-cart-v1", JSON.stringify([{ key: "x", productId: id, variantId: id, quantity: 1 }]));
  }, id);
  await page.reload();
  await page.getByText("ya no está disponible").waitFor();
  expect(await page.getByRole("button", { name: "Finalizar pedido por WhatsApp" }).isDisabled(), "checkout activo");
  await page.evaluate(() => localStorage.removeItem("dosha-cart-v1"));
});
await step("Ajustes: cambiar WhatsApp sin tocar código", async () => {
  await page.goto(`${BASE}/admin/ajustes`);
  const input = page.getByLabel("Número de WhatsApp");
  await input.fill("300 999 8877");
  await page.getByRole("button", { name: "Guardar ajustes" }).click();
  await page.getByText("Ajustes guardados").waitFor();
  await page.goto(`${BASE}/informacion`);
  expect(await page.locator('a[href="https://wa.me/573009998877"]').count(), "WhatsApp no actualizado");
  await page.goto(`${BASE}/admin/ajustes`);
  await page.getByLabel("Número de WhatsApp").fill("573000000000");
  await page.getByRole("button", { name: "Guardar ajustes" }).click();
  await page.getByText("Ajustes guardados").waitFor();
});
await step("Ajustes: número de WhatsApp inválido es rechazado", async () => {
  await page.getByLabel("Número de WhatsApp").fill("12");
  await page.getByRole("button", { name: "Guardar ajustes" }).click();
  await page.getByText("no es válido").first().waitFor();
  await page.getByLabel("Número de WhatsApp").fill("573000000000");
});
await step("Eliminar el producto de prueba", async () => {
  await page.goto(`${BASE}/admin/productos`);
  const row = page.locator("li", { hasText: NAME }).first();
  await row.locator("summary:has-text('Más')").click();
  await row.getByRole("button", { name: "Eliminar" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  expect((await page.getByText(NAME).count()) === 0, "sigue existiendo");
});
await step("Eliminar el color de prueba desde «Categorías y colores»", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.getByRole("button", { name: `Eliminar ${createdColor}` }).click();
  await page.waitForTimeout(800);
  await page.reload();
  expect((await page.getByRole("button", { name: `Eliminar ${createdColor}` }).count()) === 0, "el color sigue existiendo");
});
await step("Cerrar sesión protege el panel otra vez", async () => {
  await page.getByRole("button", { name: "Cerrar sesión" }).last().click();
  await page.waitForURL(`${BASE}/admin/login`);
  await page.goto(`${BASE}/admin/ajustes`);
  expect(page.url().endsWith("/admin/login"), "panel accesible tras cerrar sesión");
});

console.log("\nCelular (iPhone 13)");
const mctx = await browser.newContext({ ...devices["iPhone 13"] });
const m = await mctx.newPage();
m.setDefaultTimeout(15000);
m.on("pageerror", (e) => errors.push(e.message));
await step("Menú móvil, compra rápida y carrito en celular", async () => {
  await m.goto(`${BASE}/`);
  await m.getByRole("button", { name: "Abrir menú" }).click();
  await m.getByRole("dialog", { name: "Menú" }).getByRole("link", { name: "Tienda" }).click();
  await m.waitForURL(`${BASE}/tienda`);
  await m.getByRole("button", { name: /Filtrar/ }).click();
  await m.getByRole("dialog", { name: "Filtros" }).getByText("Entrega inmediata").click();
  await m.waitForURL(/disponibilidad=inmediata/);
  await m.getByRole("button", { name: /^Ver \d+ productos?$/ }).click();
  await m.goto(`${BASE}/producto/ejemplo-bolso-tote`);
  await m.getByRole("radio", { name: "Plum" }).click();
  await m.getByText("$369.000").first().waitFor();
  await m.getByRole("button", { name: "Agregar al carrito" }).click();
  await m.getByRole("link", { name: "Ver carrito" }).click();
  await m.getByText("$369.000").first().waitFor();
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(!overflow, "hay desplazamiento horizontal en celular");
  await shot(m, "carrito-movil");
});
await step("Sin errores de JavaScript en el navegador", async () => {
  expect(errors.length === 0, errors.join(" | "));
});

await browser.close();
console.log(`\n${passed} pruebas superadas, ${failures.length} fallidas`);
if (failures.length) {
  console.log("Fallidas:\n - " + failures.join("\n - "));
  process.exit(1);
}
