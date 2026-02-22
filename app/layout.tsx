import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reposición inteligente",
  description: "Control de inventario y pedidos por proveedor para negocios"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
