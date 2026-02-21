"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Badge, Button, Sticker } from "@/components/ui";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useI18n } from "@/components/i18n/I18nProvider";

const tourByPath: Record<string, string> = {
  "/dashboard": "dashboard",
  "/import": "import",
  "/reconcile": "tickets",
  "/stock": "stock",
  "/orders": "orders",
  "/movements": "movements"
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang, t } = useI18n();

  const nav = useMemo(
    () => [
      { href: "/dashboard", label: t("nav.dashboard"), icon: "📊" },
      { href: "/today", label: t("nav.today"), icon: "✅" },
      { href: "/products", label: t("nav.products"), icon: "📦" },
      { href: "/movements", label: t("nav.movements"), icon: "🧾" },
      { href: "/stock", label: t("nav.stock"), icon: "🧠" },
      { href: "/orders", label: t("nav.orders"), icon: "🚚" },
      { href: "/import", label: t("nav.import"), icon: "⬆️" },
      { href: "/reconcile", label: t("nav.reconcile"), icon: "🔎" },
      { href: "/categories", label: t("nav.categories"), icon: "🏷️" },
      { href: "/aliases", label: t("nav.aliases"), icon: "🔁" },
      { href: "/assistant", label: t("nav.assistant"), icon: "🤖" },
      { href: "/copilot", label: t("nav.copilot"), icon: "🧩" }
    ],
    [t]
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setMobileOpen((v) => !v)}>☰</Button>
          <span className="text-sm font-bold text-slate-900">SmartStock</span>
          <Badge tone="slate" className="ml-1">{t("brand.demo")}</Badge>
        </div>
        <div className="text-xs text-slate-500">{pathname}</div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-[280px_1fr]">
        <aside className={["border-r border-slate-200 bg-white md:sticky md:top-0 md:h-screen", mobileOpen ? "block" : "hidden md:block"].join(" ")}>
          <div className="flex h-full flex-col p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sticker tone="purple">✨</Sticker>
                <div>
                  <div className="text-sm font-bold text-slate-900">SmartStock</div>
                  <div className="text-xs text-slate-500">{t("brand.market")}</div>
                </div>
              </div>
              <Badge tone="slate">{t("brand.mvp")}</Badge>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">{t("lang.label")}</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
              >
                <option value="es">{t("lang.es")}</option>
                <option value="en">{t("lang.en")}</option>
                <option value="pt">{t("lang.pt")}</option>
              </select>
            </div>

            <div className="mt-3">
              <RoleSwitcher />
            </div>

            <nav className="mt-4 space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} data-tour={tourByPath[item.href]} className={["flex items-center justify-between rounded-xl px-3 py-2 text-sm transition", active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"].join(" ")}>
                    <span className="flex items-center gap-2"><span aria-hidden>{item.icon}</span>{item.label}</span>
                    {active ? <span className="text-xs">•</span> : null}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-2 pt-4 text-xs text-slate-500">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="font-semibold text-slate-700">{t("demo.title")}</div>
                <div className="mt-1">{t("demo.text")}</div>
              </div>

              <div data-tour="login-future" className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
                <div className="font-semibold text-indigo-900">🔐 {t("auth.future.title")}</div>
                <div className="mt-1 text-indigo-700">{t("auth.future.text")}</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
