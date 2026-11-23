import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { AccountManager } from "@/components/admin/account-manager";

export const metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const me = await requireAdmin();
  const users = await db
    .select({ id: schema.adminUsers.id, email: schema.adminUsers.email, name: schema.adminUsers.name })
    .from(schema.adminUsers)
    .orderBy(asc(schema.adminUsers.createdAt));
  return (
    <>
      <PageHeader title="Mi cuenta" description="Cambia tu contraseña y gestiona quién puede entrar al panel." />
      <AccountManager meId={me.id} users={users} />
    </>
  );
}
