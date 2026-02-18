"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardContent, Sticker } from "@/components/ui";

const SEEN_KEY = "smartstock:tourSeen";

type Step = {
  step: number;
  title: string;
  desc: string;
  href: string;
  cta: string;
  sticker: { text: string; tone: "indigo" | "pink" | "emerald" | "amber" | "slate" | "purple" };
};

const STEPS: Step[] = [
  {
    step: 1,
    title: "Importá productos en 30 segundos",
    desc: "Subí Excel/CSV y dejá que el mapeo te sugiera columnas.",
    href: "/import",
    cta: "Ir a Importar",
    sticker: { text: "⬆️ Import", tone: "indigo" }
  },
  {
    step: 2,
    title: "Registrá una venta rápida",
    desc: "Cargá salidas en segundos (sin abrir planillas).",
    href: "/movements?type=OUT",
    cta: "Registrar venta",
    sticker: { text: "⚡ POS", tone: "amber" }
  },
  {
    step: 3,
    title: "Mirá la lista de compra inteligente",
    desc: "Te ordena lo crítico y lo que conviene reponer.",
    href: "/stock",
    cta: "Abrir Stock",
    sticker: { text: "🧠 Stock", tone: "purple" }
  },
  {
    step: 4,
    title: "Armá pedidos por proveedor",
    desc: "Seleccionás ítems y te genera el mensaje listo para WhatsApp.",
    href: "/stock",
    cta: "Generar pedido",
    sticker: { text: "🛒 Pedido", tone: "emerald" }
  },
  {
    step: 5,
    title: "Preguntale a la IA",
    desc: "Ej: “¿Qué compro hoy?” o “Armame el mensaje al proveedor”.",
    href: "/assistant",
    cta: "Abrir Asistente",
    sticker: { text: "✨ IA", tone: "pink" }
  }
];

function getInt(x: string | null, fallback: number) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function withTour(url: string, step: number) {
  // URL can be /path or /path?x=1
  const u = new URL(url, typeof window !== "undefined" ? window.location.href : "http://localhost");
  u.searchParams.set("tour", "1");
  u.searchParams.set("step", String(step));
  return u.pathname + "?" + u.searchParams.toString();
}

export function DemoTour() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const isTour = sp.get("tour") === "1";
  const step = Math.min(5, Math.max(1, getInt(sp.get("step"), 1)));

  const [seen, setSeen] = React.useState(true);

  React.useEffect(() => {
    try {
      const v = localStorage.getItem(SEEN_KEY);
      setSeen(v === "1");
    } catch {
      setSeen(true);
    }
  }, []);

  function start() {
    router.push(withTour("/dashboard", 1));
  }

  function close() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
    setSeen(true);

    // Remove tour params but keep current path.
    router.push(pathname || "/dashboard");
  }

  const current = STEPS.find((s) => s.step === step) ?? STEPS[0];
  const prev = step > 1 ? step - 1 : 1;
  const next = step < 5 ? step + 1 : 5;

  const shouldPrompt = !isTour && !seen && (pathname === "/dashboard" || pathname === "/");

  return (
    <>
      {shouldPrompt ? (
        <Card className="mb-5 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600" />
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Sticker tone="pink">🎬 Tour demo</Sticker>
                <div className="text-sm font-semibold text-slate-900">Mostralo en 60 segundos (sin explicar de más)</div>
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Te guía por lo que más impacta: importación, POS, stock inteligente y asistente IA.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={start}>Iniciar tour</Button>
              <Button variant="ghost" onClick={close}>
                No mostrar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isTour ? (
        <div className="fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))]">
          <Card className="overflow-hidden shadow-lg">
            <div className="h-1 w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Sticker tone={current.sticker.tone}>{current.sticker.text}</Sticker>
                    <div className="text-xs font-semibold text-slate-500">Paso {step}/5</div>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{current.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{current.desc}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={close} aria-label="Cerrar tour">
                  ✕
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link href={withTour(current.href, step)}>
                  <Button>
                    <span aria-hidden>👉</span>
                    {current.cta}
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => router.push(withTour(current.href, step))}>
                  Abrir en esta pestaña
                </Button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.push(withTour(STEPS[prev - 1].href, prev))}>
                  ← Atrás
                </Button>
                <div className="text-[11px] text-slate-500">
                  Tip: grabá pantalla y seguí los pasos.
                </div>
                <Button size="sm" onClick={() => router.push(withTour(STEPS[next - 1].href, next))}>
                  Siguiente →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
