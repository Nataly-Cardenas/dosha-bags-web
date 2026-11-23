import Link from "next/link";
import { IconArrow } from "@/components/icons";

export function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-6 border-b border-line pb-5">
      <div>
        <p className="eyebrow text-taupe">{eyebrow}</p>
        <h2 className="mt-3 text-4xl text-cranberry md:text-5xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="eyebrow link-underline hidden shrink-0 items-center gap-2 pb-1 sm:inline-flex">
          {linkLabel} <IconArrow size={14} />
        </Link>
      )}
    </div>
  );
}
