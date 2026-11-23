ALTER TABLE "products" ADD COLUMN "mto_min_days" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "mto_max_days" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "catalog_imported_at" timestamp with time zone;