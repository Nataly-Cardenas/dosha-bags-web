import type { Metadata, Viewport } from "next";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "@fontsource-variable/jost";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Dosha Bags · Bolsos", template: "%s · Dosha Bags" },
  description: "Bolsos colombianos de diseño atemporal. Elige tu color, personalízalo y pide por WhatsApp.",
  openGraph: { type: "website", locale: "es_CO", siteName: "Dosha Bags", images: ["/brand/logo-dosha.png"] },
};

export const viewport: Viewport = {
  themeColor: "#3f1116",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
