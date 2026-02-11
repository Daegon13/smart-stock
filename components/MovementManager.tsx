"use client";

import * as React from "react";
import { Badge, Button, Card, CardContent, CardHeader, Input, Label, Select } from "@/components/ui";

export type ProductMini = { id: string; name: string; unit: string; currentStock: number; stockMin: number };

export type MovementDTO = {
  id: string;
  type: "IN" | "OUT" | "ADJUST";
  qty: number;
  note: string | null;
  createdAt: string;
  product: { name: string; unit: string };
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

function fmtType(t: MovementDTO["type"]) {
  if (t === "IN") return "Entrada";
  if (t === "OUT") return "Salida";
  return "Ajuste";
}

export function MovementManager({ storeId, products }: { storeId: string; products: ProductMini[] }) {
  const [items, setItems] = React.useState<MovementDTO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    productId: products[0]?.id || "",
    type: "OUT" as MovementDTO["type"],
    qty: "1",
    note: ""
  });

  async function refresh() {
    const data = await jsonFetch<{ movements: MovementDTO[] }>(`/api/movements?storeId=${storeId}`);
    setItems(data.movements);
  }

  React.useEffect(() => {
    refresh().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setLoading(true);
    try {
      await jsonFetch(`/api/movements`, {
        method: "POST",
        body: JSON.stringify({ storeId, ...form })
      });
      setOk("Movimiento registrado.");
      setForm((f) => ({ ...f, qty: "1", note: "" }));
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo registrar");
    } finally {
      setLoading(false);
    }
  }

  const selected = products.find((p) => p.id === form.productId);
  const hint = selected
    ? `Stock actual: ${selected.currentStock} (mínimo ${selected.stockMin})`
    : "";

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="text-sm font-semibold text-slate-900">Movimiento rápido</div>
          <div className="text-xs text-slate-500">La forma más fácil de mantener stock confiable.</div>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onCreate}>
            <div>
              <Label>Producto</Label>
              <Select value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <div className="mt-1 text-xs text-slate-500">{hint}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}>
                  <option value="IN">Entrada (compra)</option>
                  <option value="OUT">Salida (venta)</option>
                  <option value="ADJUST">Ajuste (setear stock)</option>
                </Select>
              </div>
              <div>
                <Label>{form.type === "ADJUST" ? "Stock final" : "Cantidad"}</Label>
                <Input type="number" min={0} value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Nota (opcional)</Label>
              <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Ej: devolución, merma, promo..." />
            </div>

            {err ? <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{err}</div> : null}
            {ok ? <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">{ok}</div> : null}

            <Button disabled={loading || !form.productId}>{loading ? "Guardando..." : "Registrar"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Últimos movimientos</div>
              <div className="text-xs text-slate-500">Se muestran los últimos 50.</div>
            </div>
            <Button variant="ghost" onClick={() => refresh()} disabled={loading}>
              Refrescar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-sm text-slate-600">
              Todavía no hay movimientos. Registrá el primero para que las sugerencias sean más precisas.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{m.product.name}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(m.createdAt).toLocaleString()} · {m.note ? m.note : "sin nota"}
                    </div>
                  </div>
                  <Badge variant={m.type === "OUT" ? "soon" : m.type === "ADJUST" ? "neutral" : "ok"}>
                    {fmtType(m.type)}
                  </Badge>
                  <div className="w-24 text-right text-sm font-semibold text-slate-900">
                    {m.type === "OUT" ? "-" : m.type === "IN" ? "+" : "="}
                    {m.qty}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
