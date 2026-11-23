import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/admin/page-header";
import { OrdersList } from "@/components/admin/orders-list";

export const metadata = { title: "Solicitudes de pedido" };

export default async function OrdersPage() {
  const orders = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(300);
  return (
    <>
      <PageHeader
        title="Solicitudes de pedido"
        description="Cada vez que alguien pulsa «Finalizar pedido por WhatsApp» se registra aquí como «Pendiente de confirmar». No significa que esté pagado: actualiza el estado cuando lo confirmes con la clienta. El código (DB-0001) aparece también en el mensaje de WhatsApp."
      />
      <OrdersList orders={orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() }))} />
    </>
  );
}
