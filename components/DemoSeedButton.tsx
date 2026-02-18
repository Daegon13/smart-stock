"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Sticker } from "@/components/ui";

type Props = {
  label?: string;
  variant?: "primary" | "ghost" | "outline" | "soft";
  className?: string;
};

export function DemoSeedButton({ label = "Cargar datos demo", variant = "primary", className = "" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function run() {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const m = (data && (data.message || data.error)) || `Error ${res.status}`;
        setMsg(String(m));
        return;
      }
      setMsg("Listo. Cargué datos demo.");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "No pude cargar los datos demo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button onClick={run} disabled={loading} variant={variant}>
        <Sticker tone="amber">📦 Demo</Sticker>
        {loading ? "Cargando…" : label}
      </Button>
      {msg ? <div className="mt-2 text-xs text-slate-600">{msg}</div> : null}
    </div>
  );
}
