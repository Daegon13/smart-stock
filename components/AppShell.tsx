"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Productos" },
  { href: "/movements", label: "Movimientos" },
  { href: "/stock", label: "Stock inteligente" },
  { href: "/assistant", label: "Asistente IA" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar (mobile) */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <Link href="/dashboard" className="font-semibold text-slate-900">
            Stock Inteligente
          </Link>
          <div className="ml-auto text-xs text-slate-500">MVP</div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 md:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside
          className={
            "border-r border-slate-200 bg-white md:sticky md:top-0 md:block md:h-screen " +
            (open ? "block" : "hidden md:block")
          }
        >
          <div className="flex h-full flex-col">
            <div className="hidden border-b border-slate-200 px-4 py-4 md:block">
              <Link href="/dashboard" className="text-base font-semibold text-slate-900">
                Stock Inteligente
              </Link>
              <div className="mt-1 text-xs text-slate-500">Panel de operaciones</div>
            </div>

            <nav className="p-3">
              <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Menú
              </div>
              <div className="space-y-1">
                {nav.map((i) => {
                  const active = pathname?.startsWith(i.href);
                  return (
                    <Link
                      key={i.href}
                      href={i.href}
                      onClick={() => setOpen(false)}
                      className={
                        "block rounded-lg px-3 py-2 text-sm transition " +
                        (active
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900")
                      }
                    >
                      {i.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="mt-auto border-t border-slate-200 p-4 text-xs text-slate-500">
              Consejo: empezá por <span className="font-medium">Movimientos</span> para que el stock sea confiable.
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="px-4 py-6 md:px-6 md:py-10">{children}</main>
      </div>
    </div>
  );
}
