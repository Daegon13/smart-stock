"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, Input, Label } from "@/components/ui";
import { DemoSeedButton } from "@/components/DemoSeedButton";
import { buildPurchaseCsv, buildSupplierPurchaseMessage, buildWhatsAppUrl } from "@/lib/stock";

export type SuggestionDTO = {
  productId: string;
  name: string;
  sku?: string | null;
  unit?: string;

  supplierId?: string | null;
  supplierName?: string | null;
  supplierPhone?: string | null;

  currentStock: number;
  stockMin: number;

  leadTimeDays: number;
  coverageDays: number;
  safetyStock: number;

  avgDailyOut: number;
  daysCover: number | null;

  reorderPoint: number;
  targetStock: number;
  suggestedQty: number;

  severity: "ok" | "soon" | "low";
  reason: string;
};

type DraftDTO = {
  id: string;
  supplierName: string | null;
  createdAt: string;
  itemCount: number;
};

type SuggestionsMeta = {
  productCount: number;
  outMovementsCount: number;
  productsMissingMinCount: number;
  lookbackDays: number;
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

function downloadTextFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type SupplierGroup = {
  key: string;
  supplierId: string | null;
  supplierName: string;
  supplierPhone: string | null;
  items: SuggestionDTO[];
};

function groupBySupplier(items: SuggestionDTO[]): SupplierGroup[] {
  const map = new Map<string, SupplierGroup>();
  for (const it of items) {
    const supplierId = it.supplierId ?? null;
    const key = supplierId ?? "__none__";
    const supplierName = it.supplierName?.trim() ? it.supplierName.trim() : "Sin proveedor";
    const supplierPhone = it.supplierPhone ?? null;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(it);
    } else {
      map.set(key, {
        key,
        supplierId,
        supplierName,
        supplierPhone,
        items: [it]
      });
    }
  }

  const prio = (s: SuggestionDTO["severity"]) => (s === "low" ? 0 : s === "soon" ? 1 : 2);
  return Array.from(map.values())
    .map((g) => ({
      ...g,
      items: [...g.items].sort((a, b) => {
        const d = prio(a.severity) - prio(b.severity);
        if (d !== 0) return d;
        return b.suggestedQty - a.suggestedQty;
      })
    }))
    .sort((a, b) => {
      const aUrg = a.items.filter((i) => i.severity !== "ok" && i.suggestedQty > 0).length;
      const bUrg = b.items.filter((i) => i.severity !== "ok" && i.suggestedQty > 0).length;
      if (aUrg !== bUrg) return bUrg - aUrg;
      return a.supplierName.localeCompare(b.supplierName);
    });
}

export function StockIntelligence({ storeId, storeName, demoAllowed }: { storeId: string; storeName?: string; demoAllowed: boolean }) {
  const [items, setItems] = React.useState<SuggestionDTO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"suppliers" | "list">("suppliers");

  const [meta, setMeta] = React.useState<SuggestionsMeta | null>(null);

  const [drafts, setDrafts] = React.useState<DraftDTO[]>([]);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);
  const [orderMsg, setOrderMsg] = React.useState<string | null>(null);
  const [orderBySupplier, setOrderBySupplier] = React.useState<Record<string, string>>({});

  const [params, setParams] = React.useState({
    lookbackDays: "30"
  });

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  async function loadDrafts() {
    try {
      const qs = new URLSearchParams({ storeId }).toString();
      const data = await jsonFetch<{ drafts: DraftDTO[] }>(`/api/purchases/drafts?${qs}`);
      setDrafts(data.drafts);
    } catch {
      // noop
    }
  }

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const qs = new URLSearchParams({ storeId, ...params }).toString();
      const data = await jsonFetch<{ suggestions: SuggestionDTO[]; meta?: SuggestionsMeta }>(
        `/api/stock/suggestions?${qs}`
      );
      setItems(data.suggestions);
      setMeta(data.meta ?? null);

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
    loadDrafts().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const groups = React.useMemo(() => groupBySupplier(items), [items]);

  const chosenGroups = React.useMemo(() => {
    return groups
      .map((g) => {
        const chosen = g.items
          .filter((i) => selected[i.productId] && i.suggestedQty > 0)
          .map((i) => ({ productId: i.productId, sku: i.sku ?? null, name: i.name, qty: i.suggestedQty, unit: i.unit ?? "" }));

        return {
          ...g,
          chosen,
          message: buildSupplierPurchaseMessage({
            supplierName: g.supplierName === "Sin proveedor" ? null : g.supplierName,
            storeName: storeName ?? null,
            items: chosen
          }),
          csv: buildPurchaseCsv(chosen),
          waUrl: buildWhatsAppUrl(
            buildSupplierPurchaseMessage({
              supplierName: g.supplierName === "Sin proveedor" ? null : g.supplierName,
              storeName: storeName ?? null,
              items: chosen
            }),
            g.supplierPhone
          )
        };
      })
      .filter((g) => g.chosen.length > 0);
  }, [groups, selected, storeName]);

  const low = items.filter((i) => i.severity === "low").length;
  const soon = items.filter((i) => i.severity === "soon").length;

  const readiness = React.useMemo(() => {
    const productCount = meta?.productCount ?? (items.length > 0 ? items.length : 0);
    const outs = meta?.outMovementsCount ?? 0;
    const missingMin = meta?.productsMissingMinCount ?? 0;
    const lookback = meta?.lookbackDays ?? Number(params.lookbackDays || 30);

    return { productCount, outs, missingMin, lookback };
  }, [meta, items.length, params.lookbackDays]);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="text-sm font-semibold text-slate-900">Parámetros</div>
          <div className="text-xs text-slate-500">
            Lead time, cobertura y colchón se configuran por producto en{" "}
            <Link className="underline" href="/products">
              Productos
            </Link>
            .
          </div>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Histórico para consumo (días)</Label>
            <Input
              type="number"
              min={7}
              value={params.lookbackDays}
              onChange={(e) => setParams((p) => ({ ...p, lookbackDays: e.target.value }))}
            />
            <div className="mt-1 text-xs text-slate-500">Tip: 14–30 días suele dar buen resultado.</div>
          </div>

          {err ? <div className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">{err}</div> : null}

          <div className="mt-4 flex items-center gap-2">
            <Button onClick={() => refresh()} disabled={loading}>
              {loading ? "Calculando..." : "🔄 Recalcular"}
            </Button>
            <div className="text-xs text-slate-500">
              {low} críticos · {soon} reponer
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-slate-700">Pedidos por proveedor</div>
            <div className="mt-1 text-xs text-slate-500">Seleccioná ítems y se arma el pedido listo para WhatsApp.</div>

            {chosenGroups.length === 0 ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Aún no seleccionaste productos para pedir.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {chosenGroups.map((g) => (
                  <div key={g.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800">{g.supplierName}</div>
                        {g.supplierPhone ? (
                          <div className="text-[11px] text-slate-500">tel: {g.supplierPhone}</div>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-500">{g.chosen.length} items</div>
                    </div>

                    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{g.message}</pre>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => navigator.clipboard.writeText(g.message).catch(() => null)}
                      >
                        📋 Copiar
                      </Button>

                      <a
                        href={g.waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500"
                      >
                        💬 WhatsApp
                      </a>

                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => {
                          const fileSafe = g.supplierName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
                          downloadTextFile(`pedido-.csv`, g.csv, "text/csv;charset=utf-8");
                        }}
                      >
                        🧾 Descargar CSV
                      </Button>

                      <Button
                        variant="soft"
                        type="button"
                        onClick={async () => {
                          setOrderMsg(null);
                          try {
                            const res = await jsonFetch<{ order: { id: string } }>("/api/purchases/orders", {
                              method: "POST",
                              body: JSON.stringify({
                                storeId,
                                supplierId: g.supplierId,
                                title: `OC - ${g.supplierName} - ${new Date().toLocaleDateString()}`,
                                notes: "Generada desde Stock Inteligente",
                                items: g.chosen.map((c) => ({ productId: c.productId, qtyOrdered: c.qty }))
                              })
                            });
                            setOrderBySupplier((m) => ({ ...m, [g.key]: res.order.id }));
                            setOrderMsg(`OC creada: ${g.supplierName}`);
                          } catch (e: any) {
                            setOrderMsg(e?.message ? `Error al crear OC: ${e.message}` : "Error al crear OC");
                          }
                        }}
                      >
                        📦 Crear OC
                      </Button>

                      {orderBySupplier[g.key] ? (
                        <Link href={`/orders/${orderBySupplier[g.key]}`}>
                          <Button variant="outline" type="button">
                            🔎 Abrir OC
                          </Button>
                        </Link>
                      ) : null}

                      <Button
                        variant="soft"
                        type="button"
                        onClick={async () => {
                          setSaveMsg(null);
                          try {
                            await jsonFetch<{ draftId: string }>("/api/purchases/drafts", {
                              method: "POST",
                              body: JSON.stringify({
                                storeId,
                                supplierId: g.supplierId,
                                title: `Pedido ${g.supplierName}`,
                                message: g.message,
                                csv: g.csv,
                                itemCount: g.chosen.length
                              })
                            });
                            setSaveMsg(`Borrador guardado: ${g.supplierName}`);
                            await loadDrafts();
                          } catch (e: any) {
                            setSaveMsg(e?.message ? `Error al guardar borrador: ${e.message}` : "Error al guardar borrador");
                          }
                        }}
                      >
                        💾 Guardar borrador
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {saveMsg ? <div className="mt-3 rounded-md bg-slate-100 p-2 text-xs text-slate-700">{saveMsg}</div> : null}
            {orderMsg ? (
              <div className="mt-3 rounded-md bg-indigo-50 p-2 text-xs text-indigo-900">{orderMsg}</div>
            ) : null}

            {drafts.length > 0 ? (
              <div className="mt-5">
                <div className="text-xs font-semibold text-slate-700">Borradores recientes</div>
                <div className="mt-2 space-y-2">
                  {drafts.slice(0, 5).map((d) => (
                    <div key={d.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-slate-900">
                            {d.supplierName ?? "Sin proveedor"}
                          </div>
                          <div className="text-[11px] text-slate-500">{new Date(d.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="text-[11px] text-slate-500">{d.itemCount} items</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Sugerencias de reposición</div>
              <div className="text-xs text-slate-500">Marcá lo que querés incluir en la compra. (1 idea por vez)</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView((v) => (v === "suppliers" ? "list" : "suppliers"))}
              >
                {view === "suppliers" ? "🏭 Proveedores" : "📋 Lista"}
              </Button>
              <Button
                variant="soft"
                size="sm"
                onClick={() => {
                  const next: Record<string, boolean> = {};
                  for (const s of items) {
                    if (s.severity !== "ok" && s.suggestedQty > 0) next[s.productId] = true;
                  }
                  setSelected(next);
                }}
              >
                ✅ Seleccionar urgentes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Callouts de “readiness”: guían al usuario sin confundir */}
          {readiness.productCount > 0 && readiness.outs === 0 ? (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 ss-card">
              <div className="font-semibold">Todavía no detectamos ventas recientes</div>
              <div className="mt-1 text-xs text-amber-800">
                En los últimos {readiness.lookback} días no hay salidas registradas. Importá ventas del POS/Excel o cargá una “Venta rápida”
                para que el cálculo sea más preciso.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="underline" href="/import">
                  Ir a Importar
                </Link>
                <span className="text-amber-800">·</span>
                <Link className="underline" href="/movements?type=OUT">
                  Venta rápida
                </Link>
              </div>
            </div>
          ) : null}

          {readiness.productCount > 0 && readiness.missingMin > 0 ? (
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 ss-card">
              <div className="font-semibold">Hay productos sin mínimo configurado</div>
              <div className="mt-1 text-xs text-slate-600">
                {readiness.missingMin} producto(s) tienen stock mínimo en 0. Definir mínimos hace que la reposición sea más confiable.
              </div>
              <div className="mt-3">
                <Link className="underline" href="/products">
                  Ir a Productos (ajustar mínimos)
                </Link>
              </div>
            </div>
          ) : null}

          {readiness.productCount === 0 && !loading ? (
            <div className="space-y-2">
              <div className="text-sm text-slate-600">Todavía no hay productos en este local.</div>
              <div className="text-xs text-slate-500">Creá productos para empezar a ver sugerencias reales.</div>
              <div className="flex flex-wrap gap-2">
                <Link className="underline" href="/products">
                  Crear productos
                </Link>
                {demoAllowed ? (
                  <>
                    <span className="text-slate-400">·</span>
                    <DemoSeedButton variant="ghost" />
                  </>
                ) : null}
              </div>
            </div>
          ) : items.length === 0 && !loading ? (
            <div className="space-y-2">
              <div className="text-sm text-slate-600">No hay sugerencias por ahora.</div>
              <div className="text-xs text-slate-500">
                Si ya tenés productos, probá recalcular. Si está todo ok, perfecto: hoy no hay urgentes.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => refresh()}>
                  🔄 Recalcular
                </Button>
                <Link className="underline text-xs" href="/today">
                  Ver “Hoy”
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {view === "suppliers" ? (
                <div className="space-y-3">
                  {groups.map((g) => {
                    const urg = g.items.filter((i) => i.severity !== "ok" && i.suggestedQty > 0).length;
                    return (
                      <details key={g.key} className="rounded-lg border border-slate-200 bg-white">
                        <summary className="cursor-pointer select-none px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-900">{g.supplierName}</div>
                              {g.supplierPhone ? (
                                <div className="text-xs text-slate-500">tel: {g.supplierPhone}</div>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={urg > 0 ? "soon" : "neutral"}>{urg} urgentes</Badge>
                            </div>
                          </div>
                        </summary>
                        <div className="space-y-2 px-3 pb-3">
                          {g.items.map((s) => (
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
                                  stock:{" "}
                                  <span
                                    className={s.severity === "low" ? "text-red-600" : "text-slate-700"}
                                  >
                                    {s.currentStock}
                                  </span>
                                  {" "}· min: {s.stockMin}
                                  {s.daysCover !== null ? ` · cobertura actual: ~${s.daysCover}d` : ""}
                                  {s.avgDailyOut > 0 ? ` · consumo/día: ${s.avgDailyOut}` : ""}
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  config: lead {s.leadTimeDays}d · cobertura {s.coverageDays}d · colchón {s.safetyStock}u
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
                      </details>
                    );
                  })}
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
                          proveedor: {s.supplierName?.trim() ? s.supplierName : "Sin proveedor"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          stock:{" "}
                          <span className={s.severity === "low" ? "text-red-600" : "text-slate-700"}>
                            {s.currentStock}
                          </span>
                          {" "}· min: {s.stockMin}
                          {s.daysCover !== null ? ` · cobertura actual: ~${s.daysCover}d` : ""}
                          {s.avgDailyOut > 0 ? ` · consumo/día: ${s.avgDailyOut}` : ""}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          config: lead {s.leadTimeDays}d · cobertura {s.coverageDays}d · colchón {s.safetyStock}u
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}