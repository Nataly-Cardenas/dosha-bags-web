import { getEditorOptions } from "@/lib/admin-data";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/page-header";

export const metadata = { title: "Nuevo producto" };

export default async function NewProduct() {
  const options = await getEditorOptions();
  return (
    <>
      <PageHeader title="Nuevo producto" description="Completa la información y pulsa «Guardar». Puedes dejarlo oculto mientras lo preparas." />
      <ProductForm options={options} />
    </>
  );
}
