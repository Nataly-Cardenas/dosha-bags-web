import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db";

const COOKIE = "dosha_admin";
const SESSION_DAYS = 14;
const MAX_FAILED_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
}

export async function ipHash() {
  return sha256("dosha:" + (await clientIp())).slice(0, 32);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(schema.adminSessions).values({ id: sha256(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(schema.adminSessions).where(eq(schema.adminSessions.id, sha256(token)));
  jar.delete(COOKIE);
}

/** Devuelve la administradora con sesión activa, o null. Se memoriza por petición. */
export const getAdmin = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: schema.adminUsers.id, email: schema.adminUsers.email, name: schema.adminUsers.name })
    .from(schema.adminSessions)
    .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.adminSessions.userId))
    .where(and(eq(schema.adminSessions.id, sha256(token)), gt(schema.adminSessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
});

/** Úsalo al inicio de TODA página y acción administrativa. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Igual que requireAdmin pero lanza error (para acciones que devuelven datos). */
export async function assertAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Sesión vencida. Vuelve a iniciar sesión.");
  return admin;
}

export async function tooManyAttempts(key: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.loginAttempts)
    .where(
      and(
        eq(schema.loginAttempts.key, key),
        gt(schema.loginAttempts.createdAt, new Date(Date.now() - WINDOW_MINUTES * 60e3)),
      ),
    );
  return n >= MAX_FAILED_ATTEMPTS;
}

export async function recordFailedAttempt(key: string) {
  await db.insert(schema.loginAttempts).values({ key });
}

let dummyHash: string | undefined;

export async function verifyCredentials(email: string, password: string) {
  const [user] = await db
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, email.trim().toLowerCase()))
    .limit(1);
  // Siempre ejecutamos bcrypt para no revelar si el correo existe por diferencia de tiempo.
  dummyHash ??= await bcrypt.hash("dosha-dummy-password", 12);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  return ok && user ? user : null;
}

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const comparePassword = (p: string, h: string) => bcrypt.compare(p, h);
