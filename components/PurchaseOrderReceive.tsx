"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Sticker } from "@/components/ui";

type Item = {
  id: string;
  productName: string;
  unit: string;
  qtyOrdered: number;
  qtyReceived: number;
};

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json" },
    ...init
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status}`);
  }
  return (await res.json()) as T;
}

export function PurchaseOrderReceive({ orderId, items }: { orderId: string; items: Item[] }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const [ok, setOk] = React.useState<string>("");

  const [qtyMap, setQtyMap] = React.useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const i of items) init[i.id] = "";
    return init;
  });

  function remaining(i: Item) {
    return Math.max(0, i.qtyOrdered - i.qtyReceived);
  }

  function fillAll() {
    const next: Record<string, string> = {};
    for (const i of items) {
      const r = remaining(i);
      next[i.id] = r > 0 ? String(r) : "";
    }
    setQtyMap(next);
  }

  async function submit() {
    setError("");
    setOk("");

    const payloadItems = items
      .map((i) => ({ itemId: i.id, qty: Number(qtyMap[i.id] || 0) }))
      .filter((x) => Number.isFinite(x.qty) && x.qty > 0);

    if (payloadItems.length === 0) {
      setError("No hay cantidades para recibir.");
      return;
    }

    // Validación rápida client-side
    for (const it of payloadItems) {
      const row = items.find((x) => x.id === it.itemId);
      if (!row) continue;
      const r = remaining(row);
      if (it.qty > r) {
        setError(`Te pasaste en ${row.productName}. Queda por recibir: ${r}.`);
        return;
      }
    }

    setLoading(true);
    try {
      await jsonFetch(`/api/purchases/orders/${orderId}/receive`, {
        method: "POST",
        body: JSON.stringify({ items: payloadItems })
      });
      setOk("Recepción registrada. Actualizando…");
      setQtyMap((prev) => {
        const cleared = { ...prev };
        for (const p of payloadItems) cleared[p.itemId] = "";
        return cleared;
      });
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Error al registrar recepción");
    } finally {
      setLoading(false);
    }
  }

  const canFill = items.some((i) => remaining(i) > 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-600">
          Tip: si llega todo junto, usá <span className="font-semibold">Recibir todo</span>.
        </div>
        <Button variant="outline" onClick={fillAll} disabled={!canFill}>
          <Sticker tone="emerald">✅</Sticker>
          Recibir todo
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((i) => {
          const r = remaining(i);
          const done = r === 0;
          return (
            <div key={i.id} className="rounded-2xl border border-slate-200/60 bg-white/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{i.productName}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    restante: {r} {i.unit}
                  </div>
                </div>
                <div className="w-28">
                  <Input
                    value={qtyMap[i.id] ?? ""}
                    onChange={(e) => setQtyMap((m) => ({ ...m, [i.id]: e.target.value }))}
                    placeholder={done ? "OK" : "0"}
                    disabled={done || loading}
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {ok ? <div className="text-sm text-emerald-700">{ok}</div> : null}

      <Button onClick={submit} disabled={loading} className="w-full">
        <span aria-hidden>📥</span>
        Registrar recepción
      </Button>
    </div>
  );
}
