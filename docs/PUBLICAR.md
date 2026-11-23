# Cómo publicar la tienda de Dosha Bags

Esta guía no requiere saber programar. Tiempo estimado: 30–45 minutos.
Nunca compartas contraseñas ni claves por chat: todas se escriben directamente en las páginas de GitHub y Vercel.

> **Recomendación sobre la propiedad de las cuentas.** Lo ideal es que las cuentas de GitHub y Vercel
> se creen **con el correo de Dosha Bags** (de la propietaria), y que la persona que desarrolla sea invitada.
> Así la marca siempre es dueña de su tienda.

---

## Paso 1 · Subir el código a GitHub

1. Crea una cuenta en <https://github.com> (gratuita).
2. Pulsa **New repository**. Nombre: `dosha-bags`. Elige **Private**. No marques ninguna casilla adicional. Pulsa **Create repository**.
3. Sube el código. Si trabajas con la desarrolladora, ella lo sube por ti; solo necesita el nombre del repositorio.
   Si lo haces tú desde tu computador, en la carpeta del proyecto:

   ```bash
   git remote add origin https://github.com/TU-USUARIO/dosha-bags.git
   ```

   ```bash
   git push -u origin main
   ```

## Paso 2 · Crear el proyecto en Vercel

1. Entra a <https://vercel.com/signup> y regístrate **con tu cuenta de GitHub**.
2. Pulsa **Add New… → Project**, busca `dosha-bags` y pulsa **Import**.
3. **No pulses Deploy todavía.** Abre **Environment Variables** y agrega estas tres:

   | Nombre | Valor |
   | --- | --- |
   | `ADMIN_EMAIL` | El correo con el que la propietaria entrará al panel |
   | `ADMIN_INITIAL_PASSWORD` | Una contraseña temporal de al menos 10 caracteres (se cambia después) |
   | `NEXT_PUBLIC_SITE_URL` | Por ahora `https://dosha-bags.vercel.app` (o el nombre que te asigne Vercel) |

4. Pulsa **Deploy**. **Fallará** con el mensaje «Falta DATABASE_URL»: es normal, falta conectar la base de datos.

## Paso 3 · Conectar la base de datos (Neon)

1. En el proyecto de Vercel, abre la pestaña **Storage**.
2. Pulsa **Create Database** → elige **Neon** (Serverless Postgres) → plan **Free** → región **Washington, D.C. (iad1)** o la más cercana que ofrezca → **Create**.
3. Cuando pregunte, conéctala al proyecto `dosha-bags` en todos los entornos (Production, Preview, Development).
   Vercel agrega solo la variable `DATABASE_URL`.

## Paso 4 · Conectar el almacenamiento de fotos (Blob)

1. En la misma pestaña **Storage**, pulsa **Create Database** → **Blob** → **Create**.
2. Conéctalo al proyecto `dosha-bags`. Vercel agrega solo la variable `BLOB_READ_WRITE_TOKEN`.

## Paso 5 · Publicar

1. Ve a **Deployments**, abre el último despliegue y pulsa **⋯ → Redeploy**.
2. Al terminar verás el aviso **Ready**. En el registro del despliegue debe aparecer:
   `✔ Migraciones aplicadas` y `✔ Cuenta administradora creada para …`.
3. Abre la dirección de tu tienda. La tienda aparecerá **vacía**: es lo correcto, todavía no hay productos.

## Paso 6 · Primer ingreso al panel

1. Entra a `https://TU-TIENDA/admin` con `ADMIN_EMAIL` y `ADMIN_INITIAL_PASSWORD`.
2. Ve a **Mi cuenta** y cambia la contraseña por una definitiva.
3. Ve a **Ajustes de la tienda** y configura **el número de WhatsApp** (sin él no se pueden enviar pedidos), Instagram,
   imagen de portada, textos de «Nosotros» y las políticas de envío, cambios y devoluciones.
   Los textos marcados con **[Texto provisional]** deben reemplazarse.
4. Crea las **categorías y colores**, luego las **colecciones** y por último los **productos** (ver `MANUAL-PANEL.md`).

> Por seguridad, puedes borrar la variable `ADMIN_INITIAL_PASSWORD` en Vercel después del primer ingreso.
> Solo se usa cuando no existe ninguna cuenta administradora.

## Paso 7 · Conectar el dominio propio (opcional)

1. Compra el dominio (por ejemplo `doshabags.com` o `doshabags.co`) en un proveedor como Namecheap, GoDaddy o en el mismo Vercel.
2. En Vercel: **Settings → Domains → Add** y escribe el dominio.
3. Vercel te mostrará uno o dos registros DNS (tipo `A` y/o `CNAME`). Cópialos en el panel DNS de tu proveedor.
   La conexión puede tardar desde minutos hasta 24 horas.
4. Cambia la variable `NEXT_PUBLIC_SITE_URL` a `https://www.tudominio.com` y haz **Redeploy**.

## Paso 8 · Entregar la administración a la propietaria

- **Panel de la tienda:** en **Mi cuenta → Dar acceso a otra persona** se crean accesos con contraseña temporal.
  Cuando la propietaria tenga su acceso, puede quitar el de la desarrolladora.
- **Vercel:** si la cuenta es de la desarrolladora, se puede transferir el proyecto en **Settings → General → Transfer Project**.
  Neon y Blob se transfieren junto con el proyecto.
- **GitHub:** **Settings → Collaborators** para invitar, o **Settings → Transfer ownership** para transferir el repositorio.

## Costos y planes

| Servicio | Plan inicial | Notas |
| --- | --- | --- |
| Vercel | Hobby (gratis) o Pro (USD 20/mes) | **Importante:** las condiciones de Vercel reservan el plan Hobby para uso personal y no comercial. Para una tienda que vende, lo correcto es el plan **Pro**. Puedes probar en Hobby y pasar a Pro al lanzar. |
| Neon (base de datos) | Free | Suficiente para el catálogo y las solicitudes de una tienda pequeña. |
| Vercel Blob (fotos) | Incluido según el plan | Las fotos se optimizan (≈150–400 KB cada una). |
| Dominio | ~USD 10–40/año | Según el proveedor y la extensión (.com, .co). |

## Si algo falla

| Síntoma | Solución |
| --- | --- |
| El despliegue dice «Falta DATABASE_URL» | Repite el Paso 3 y haz Redeploy. |
| «No hay cuentas administradoras» en el registro | Revisa `ADMIN_EMAIL` y `ADMIN_INITIAL_PASSWORD` (mínimo 10 caracteres) y haz Redeploy. |
| Al subir fotos: «Falta conectar Vercel Blob» | Repite el Paso 4 y haz Redeploy. |
| El carrito dice «La tienda aún no ha configurado su WhatsApp» | Panel → Ajustes → Número de WhatsApp. |
| Olvidaste la contraseña del panel | Otra administradora puede restablecerla en **Mi cuenta**. Si no hay otra, la persona que desarrolla puede crear un acceso nuevo. |
| «Demasiados intentos» al entrar | Espera 15 minutos (protección contra ataques). |
