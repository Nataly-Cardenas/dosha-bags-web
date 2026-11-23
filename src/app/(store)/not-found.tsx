import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x py-28 text-center">
      <p className="eyebrow text-taupe">Error 404</p>
      <h1 className="mt-4 text-5xl text-cranberry">No encontramos esta página</h1>
      <p className="mt-4 text-muted">Es posible que el producto ya no esté disponible.</p>
      <Link href="/tienda" className="btn btn-primary mt-8">
        Ir a la tienda
      </Link>
    </div>
  );
}
