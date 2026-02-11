"use client";

import * as React from "react";
import { Badge, Button, Card, CardContent, CardHeader, Input, Label } from "@/components/ui";
import { buildPurchaseMessage } from "@/lib/stock";

export type SuggestionDTO = {
  productId: string;
  name: string;
  currentStock: number;
  stockMin: number;
  avgDailyOut: number;
  daysCover: number | null;
  reorderPoint: number;
  targetStock: number;
  suggestedQty: number;
  severity: "ok" | "soon" | "low";
  reason: string;
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

function sevBadge(s: SuggestionDTO["severity"]) {
  if (s === "low") return <Badge variant="low">Crítico</Badge>;
  if (s === "soon") return <Badge variant="soon">Reponer</Badge>;
  return <Badge variant="ok">OK</Badge>;
}

export function StockIntelligence({ storeId }: { storeId: string }) {
  const [items, setItems] = React.useState<SuggestionDTO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [params, setParams] = React.useState({
    lookbackDays: "30",
    leadTimeDays: "3",
    safetyDays: "4",
    reviewDays: "7"
  });

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const qs = new URLSearchParams({ storeId, ...params }).toString();
      const data = await jsonFetch<{ suggestions: SuggestionDTO[] }>(`/api/stock/suggestions?${qs}`);
      setItems(data.suggestions);
      // auto-seleccionamos lo urgente
      const nextSel: Record<string, boolean> = {};
      for (const s of data.suggestions) {
        if (s.severity !== "ok" && s.suggestedQty > 0) nextSel[s.productId] = true;
      }
      setSelected(nextSel);
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo calcular sugerencias");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const chosen = items
    .filter((i) => selected[i.productId])
    .map((i) => ({ name: i.name, qty: i.suggestedQty }));
  const purchaseMessage = buildPurchaseMessage(chosen);

  const low = items.filter((i) => i.severity === "low").length;
  const soon = items.filter((i) => i.severity === "soon").length;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="text-sm font-semibold text-slate-900">Parámetros</div>
          <div className="text-xs text-slate-500">Ajustá el cálculo según tu operación.</div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Histórico (días)</Label>
              <Input
                type="number"
                min={7}
                value={params.lookbackDays}
                onChange={(e) => setParams((p) => ({ ...p, lookbackDays: e.target.value }))}
              />
            </div>
            <div>
              <Label>Lead time (días)</Label>
              <Input
                type="number"
                min={0}
                value={params.leadTimeDays}
                onChange={(e) => setParams((p) => ({ ...p, leadTimeDays: e.target.value }))}
              />
            </div>
            <div>
              <Label>Colchón (días)</Label>
              <Input
                type="number"
                min={0}
                value={params.safetyDays}
                onChange={(e) => setParams((p) => ({ ...p, safetyDays: e.target.value }))}
              />
            </div>
            <div>
              <Label>Revisión (días)</Label>
              <Input
                type="number"
                min={1}
                value={params.reviewDays}
                onChange={(e) => setParams((p) => ({ ...p, reviewDays: e.target.value }))}
              />
            </div>
          </div>

          {err ? <div className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">{err}</div> : null}

          <div className="mt-4 flex items-center gap-2">
            <Button onClick={() => refresh()} disabled={loading}>
              {loading ? "Calculando..." : "Recalcular"}
            </Button>
            <div className="text-xs text-slate-500">
              {low} críticos · {soon} reponer
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-700">Borrador para WhatsApp proveedor</div>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{purchaseMessage}</pre>
            <div className="mt-3 flex gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => navigator.clipboard.writeText(purchaseMessage).catch(() => null)}
              >
                Copiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Sugerencias de reposición</div>
              <div className="text-xs text-slate-500">Marcá lo que querés incluir en la compra.</div>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                const next: Record<string, boolean> = {};
                for (const s of items) {
                  if (s.severity !== "ok" && s.suggestedQty > 0) next[s.productId] = true;
                }
                setSelected(next);
              }}
            >
              Seleccionar urgentes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-sm text-slate-600">
              No hay productos todavía. Cargá productos y/o registrá movimientos.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((s) => (
                <label
                  key={s.productId}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!!selected[s.productId]}
                    onChange={(e) => setSelected((m) => ({ ...m, [s.productId]: e.target.checked }))}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-medium text-slate-900">{s.name}</div>
                      {sevBadge(s.severity)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      stock: <span className={s.severity === "low" ? "text-red-600" : "text-slate-700"}>{s.currentStock}</span>
                      {" "}· min: {s.stockMin}
                      {s.daysCover !== null ? ` · cobertura: ~${s.daysCover} días` : ""}
                      {s.avgDailyOut > 0 ? ` · consumo/día: ${s.avgDailyOut}` : ""}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{s.reason}</div>
                  </div>

                  <div className="w-28 text-right">
                    <div className="text-xs text-slate-500">Sugerido</div>
                    <div className="text-lg font-semibold text-slate-900">{s.suggestedQty}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
