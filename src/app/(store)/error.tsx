"use client";

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-x py-28 text-center">
      <h1 className="text-4xl text-cranberry">Algo no salió bien</h1>
      <p className="mt-4 text-muted">Tuvimos un problema cargando esta página. Inténtalo de nuevo.</p>
      <button type="button" className="btn btn-primary mt-8" onClick={reset}>
        Reintentar
      </button>
    </div>
  );
}
