"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Badge, Button, Sticker } from "@/components/ui";
import { RoleSwitcher } from "@/components/RoleSwitcher";

// Nota: algunos paths viejos quedaron por patches anteriores (pos/tickets/purchases/suppliers).
// Los reemplazamos por los módulos reales del MVP para evitar 404 y dejar la demo prolija.

const tourByPath: Record<string, string> = {
  "/dashboard": "dashboard",
  "/import": "import",
  "/reconcile": "tickets",
  "/stock": "stock",
  "/orders": "orders",
  "/movements": "movements"
};

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/today", label: "Qué hacer hoy", icon: "✅" },
  { href: "/products", label: "Productos", icon: "📦" },
  { href: "/movements", label: "Movimientos", icon: "🧾" },
  { href: "/stock", label: "Stock inteligente", icon: "🧠" },
  { href: "/orders", label: "Órdenes de compra", icon: "🚚" },
  { href: "/import", label: "Importar", icon: "⬆️" },
  { href: "/reconcile", label: "Conciliar tickets", icon: "🔎" },
  { href: "/categories", label: "Categorías", icon: "🏷️" },
  { href: "/aliases", label: "Alias", icon: "🔁" },
  { href: "/assistant", label: "Asistente IA", icon: "🤖" },
  { href: "/copilot", label: "Copiloto IA", icon: "🧩" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile topbar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setMobileOpen((v) => !v)}>
            ☰
          </Button>
          <span className="text-sm font-bold text-slate-900">SmartStock</span>
          <Badge tone="slate" className="ml-1">
            Demo
          </Badge>
        </div>
        <div className="text-xs text-slate-500">{pathname}</div>
      </div>

      {/* Layout */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside
          className={[
            "border-r border-slate-200 bg-white md:sticky md:top-0 md:h-screen",
            mobileOpen ? "block" : "hidden md:block"
          ].join(" ")}
        >
          <div className="flex h-full flex-col p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sticker tone="purple">✨</Sticker>
                <div>
                  <div className="text-sm font-bold text-slate-900">SmartStock</div>
                  <div className="text-xs text-slate-500">Minimarket • Uruguay</div>
                </div>
              </div>
              <Badge tone="slate">MVP</Badge>
            </div>

            <div className="mt-3">
              <RoleSwitcher />
            </div>

            <nav className="mt-4 space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour={tourByPath[item.href]}
                    className={[
                      "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                      active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden>{item.icon}</span>
                      {item.label}
                    </span>
                    {active ? <span className="text-xs">•</span> : null}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto pt-4 text-xs text-slate-500">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="font-semibold text-slate-700">Modo demo</div>
                <div className="mt-1">Importás → conciliás tickets → ajustás stock → armás pedidos → IA te guía.</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
