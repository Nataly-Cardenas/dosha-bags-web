import { getSettings } from "@/lib/catalog";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata = { title: "Ajustes de la tienda" };

export default async function SettingsPage() {
  const s = await getSettings();
  const { id: _id, updatedAt: _u, ...values } = s;
  void _id; void _u;
  return (
    <>
      <PageHeader title="Ajustes de la tienda" description="Datos de contacto, WhatsApp, textos e imágenes de la página. Todo se actualiza en la tienda al guardar." />
      <SettingsForm initial={values} />
    </>
  );
}
