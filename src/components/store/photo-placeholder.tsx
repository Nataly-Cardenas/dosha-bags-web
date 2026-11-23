/** Se muestra cuando un producto aún no tiene fotografía. */
export function PhotoPlaceholder({ label = "Fotografía próximamente" }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-sand text-taupe">
      <span className="font-serif text-6xl italic leading-none opacity-50" aria-hidden="true">
        D
      </span>
      <span className="eyebrow text-[0.58rem] opacity-80">{label}</span>
    </div>
  );
}
