import "./globals.css";
import type { Metadata } from "next";
import { PUBLIC_SITE_URL } from "@/lib/clientShowcase";
import { contact } from "@/lib/contact";

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_URL),
  title: {
    default: "Smart Stock — demo pública de inventario y reposición",
    template: "%s | Smart Stock"
  },
  description:
    "Demo pública read-only de Smart Stock: inventario, ventas importadas, reposición y pedidos por proveedor para comercios.",
  authors: [{ name: "Marin Dev / Diego", url: contact.websiteHref }],
  creator: "Marin Dev / Diego",
  openGraph: {
    title: "Smart Stock — demo pública de inventario y reposición",
    description:
      "Showcase técnico con Next.js, Prisma y PostgreSQL para stock, importación de ventas, reposición y pedidos por proveedor.",
    type: "website",
    locale: "es_AR",
    siteName: "Smart Stock"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
