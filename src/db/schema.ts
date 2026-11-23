import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  serial,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Estado configurado por la administradora para cada color (variante).
 * - in_stock: se vende desde inventario (entrega inmediata mientras haya unidades).
 * - made_to_order: solo se fabrica por encargo.
 * - unavailable: temporalmente no disponible.
 */
export const variantStatus = pgEnum("variant_status", ["in_stock", "made_to_order", "unavailable"]);

export const orderStatus = pgEnum("order_status", [
  "pendiente",
  "confirmado",
  "pagado",
  "enviado",
  "entregado",
  "cancelado",
]);

/* ─────────────────────────── Configuración ─────────────────────────── */

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  storeName: text("store_name").notNull().default("Dosha Bags"),
  whatsappNumber: text("whatsapp_number").notNull().default(""),
  instagramUrl: text("instagram_url").notNull().default(""),
  email: text("email").notNull().default(""),
  city: text("city").notNull().default("Colombia"),
  announcement: text("announcement").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),

  heroEyebrow: text("hero_eyebrow").notNull().default(""),
  heroTitle: text("hero_title").notNull().default(""),
  heroSubtitle: text("hero_subtitle").notNull().default(""),
  heroImageUrl: text("hero_image_url"),
  heroCtaLabel: text("hero_cta_label").notNull().default("Ver la colección"),

  editorialTitle: text("editorial_title").notNull().default(""),
  editorialBody: text("editorial_body").notNull().default(""),
  editorialImageUrl: text("editorial_image_url"),

  aboutTitle: text("about_title").notNull().default(""),
  aboutBody: text("about_body").notNull().default(""),
  aboutImageUrl: text("about_image_url"),

  shippingText: text("shipping_text").notNull().default(""),
  madeToOrderText: text("made_to_order_text").notNull().default(""),
  returnsText: text("returns_text").notNull().default(""),
  contactText: text("contact_text").notNull().default(""),

  madeToOrderMinDays: integer("mto_min_days").notNull().default(3),
  madeToOrderMaxDays: integer("mto_max_days").notNull().default(5),

  /** Fecha en que se cargó automáticamente el catálogo inicial (evita repetirlo). */
  catalogImportedAt: timestamp("catalog_imported_at", { withTimezone: true }),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─────────────────────────── Catálogo ─────────────────────────── */

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const colors = pgTable("colors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  hex: text("hex").notNull().default("#9D7960"),
});

export type PersonalizationOption = {
  label: string;
  choices: { name: string; price: number; hex?: string }[];
};

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    reference: text("reference").notNull(),
    name: text("name").notNull(),
    collectionId: uuid("collection_id").references(() => collections.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    description: text("description").notNull().default(""),
    details: text("details").notNull().default(""),
    care: text("care").notNull().default(""),
    /** Precio base en pesos colombianos (entero, sin decimales). */
    price: integer("price").notNull(),
    isVisible: boolean("is_visible").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),

    personalizationEnabled: boolean("personalization_enabled").notNull().default(false),
    personalizationLabel: text("personalization_label").notNull().default("Iniciales o nombre"),
    personalizationMaxChars: integer("personalization_max_chars").notNull().default(3),
    personalizationPrice: integer("personalization_price").notNull().default(0),
    /** letters = solo letras · letters_numbers = letras y números */
    personalizationCharset: text("personalization_charset").notNull().default("letters"),
    personalizationRequired: boolean("personalization_required").notNull().default(false),
    personalizationOptions: jsonb("personalization_options").$type<PersonalizationOption[]>().notNull().default([]),
    personalizationNote: text("personalization_note").notNull().default(""),

    /** Plazo de fabricación bajo pedido propio de este producto (vacío = el general de Ajustes). */
    madeToOrderMinDays: integer("mto_min_days"),
    madeToOrderMaxDays: integer("mto_max_days"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_collection_idx").on(t.collectionId), index("products_category_idx").on(t.categoryId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    colorId: uuid("color_id")
      .notNull()
      .references(() => colors.id, { onDelete: "restrict" }),
    status: variantStatus("status").notNull().default("in_stock"),
    /** Unidades listas para entrega inmediata. */
    stock: integer("stock").notNull().default(0),
    /** Si se agota el inventario, ¿se puede fabricar por encargo? */
    allowMadeToOrder: boolean("allow_made_to_order").notNull().default(true),
    /** Precio diferente para este color (opcional). */
    priceOverride: integer("price_override"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("variant_product_color_uq").on(t.productId, t.colorId)],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Si la foto corresponde a un color concreto. */
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    url: text("url").notNull(),
    alt: text("alt").notNull().default(""),
    width: integer("width"),
    height: integer("height"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("images_product_idx").on(t.productId)],
);

/* ─────────────────────────── Solicitudes de pedido ─────────────────────────── */

export type OrderLineSnapshot = {
  productId: string;
  variantId: string;
  name: string;
  reference: string;
  color: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  personalization: string | null;
  immediateQty: number;
  madeToOrderQty: number;
  mtoMinDays?: number;
  mtoMaxDays?: number;
};

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  customerName: text("customer_name").notNull().default(""),
  customerCity: text("customer_city").notNull().default(""),
  items: jsonb("items").$type<OrderLineSnapshot[]>().notNull(),
  total: integer("total").notNull(),
  hasMadeToOrder: boolean("has_made_to_order").notNull().default(false),
  status: orderStatus("status").notNull().default("pendiente"),
  adminNote: text("admin_note").notNull().default(""),
  ipHash: text("ip_hash").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─────────────────────────── Administración ─────────────────────────── */

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminSessions = pgTable("admin_sessions", {
  /** SHA-256 del token de la cookie (el token en claro nunca se guarda). */
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_attempts_key_idx").on(t.key, t.createdAt)],
);

/* ─────────────────────────── Relaciones ─────────────────────────── */

export const productsRelations = relations(products, ({ one, many }) => ({
  collection: one(collections, { fields: [products.collectionId], references: [collections.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(productVariants),
  images: many(productImages),
}));

export const variantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  color: one(colors, { fields: [productVariants.colorId], references: [colors.id] }),
  images: many(productImages),
}));

export const imagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [productImages.variantId], references: [productVariants.id] }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  products: many(products),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));
