import { notFound } from "next/navigation";
import { z } from "zod";
import { getEditorOptions, getProductForEdit } from "@/lib/admin-data";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/page-header";

export const metadata = { title: "Editar producto" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creado?: string }> }) {
  const { id } = await params;
  const created = (await searchParams).creado === "1";
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [options, product] = await Promise.all([getEditorOptions(), getProductForEdit(id)]);
  if (!product) notFound();
  return (
    <>
      <PageHeader
        title={product.name}
        description={`Ref. ${product.reference}`}
        actions={product.isVisible ? <a href={`/producto/${product.slug}`} target="_blank" className="btn btn-outline">Ver en la tienda ↗</a> : undefined}
      />
      <ProductForm options={options} product={product} created={created} />
    </>
  );
}
