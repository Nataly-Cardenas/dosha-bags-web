import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __doshaSql?: ReturnType<typeof postgres> };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable de entorno DATABASE_URL");
  // prepare:false permite usar el pooler de Neon/pgbouncer en entornos serverless.
  return postgres(url, { prepare: false, max: process.env.NODE_ENV === "production" ? 5 : 10 });
}

const sql = globalForDb.__doshaSql ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.__doshaSql = sql;

export const db = drizzle(sql, { schema });
export { schema };
