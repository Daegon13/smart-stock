import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Inteligente (MVP)",
  description: "MVP de control de inventario y compras inteligentes para pymes"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
