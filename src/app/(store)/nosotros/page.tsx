import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSettings } from "@/lib/catalog";
import { Paragraphs } from "@/components/store/paragraphs";
import { PhotoPlaceholder } from "@/components/store/photo-placeholder";

export const revalidate = 300;
export const metadata: Metadata = { title: "Nosotros", alternates: { canonical: "/nosotros" } };

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <div className="container-x grid gap-10 pt-10 md:grid-cols-2 md:gap-20 md:pt-16">
      <div className="relative aspect-[4/5] bg-sand md:sticky md:top-28 md:self-start">
        {s.aboutImageUrl ? (
          <Image src={s.aboutImageUrl} alt={s.aboutTitle} fill priority sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
        ) : (
          <PhotoPlaceholder label="" />
        )}
      </div>
      <div className="max-w-xl md:py-10">
        <p className="eyebrow text-taupe">Nuestra historia</p>
        <h1 className="mt-4 text-5xl text-cranberry md:text-6xl">{s.aboutTitle}</h1>
        <div className="prose-dosha mt-8 text-[1.05rem] leading-relaxed text-muted">
          <Paragraphs text={s.aboutBody} />
        </div>
        <Link href="/tienda" className="btn btn-primary mt-10">
          Ver la tienda
        </Link>
      </div>
    </div>
  );
}
