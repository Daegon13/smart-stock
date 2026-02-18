"use client";

import * as React from "react";
import { Badge, Button, Card, CardContent, CardHeader, Input, Label, Select } from "@/components/ui";

export type ProductMini = {
  id: string;
  name: string;
  sku?: string | null;
  unit: string;
  currentStock: number;
  stockMin: number;
};

export type MovementDTO = {
  id: string;
  type: "IN" | "OUT" | "ADJUST";
  qty: number;
  note: string | null;
  createdAt: string;
  product: { name: string; unit: string };
};

type CreateMovementResponse = {
  movement: MovementDTO;
  product?: { id: string; currentStock: number };
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

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const RECENTS_KEY = "smartstock:recentProductIds";

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}

function saveRecents(ids: string[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(ids.slice(0, 8)));
  } catch {
    // ignore
  }
}

export function MovementManager({
  storeId,
  products,
  initialType,
  initialView
}: {
  storeId: string;
  products: ProductMini[];
  initialType?: MovementDTO["type"];
  initialView?: "quick" | "history";
}) {
  const [view, setView] = React.useState<"quick" | "history">(initialView ?? "quick");

  const [items, setItems] = React.useState<MovementDTO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  // We keep a local copy so stock hints can update immediately after a movement.
  const [plist, setPlist] = React.useState<ProductMini[]>(products);

  const [form, setForm] = React.useState({
    productId: products[0]?.id || "",
    type: (initialType && ["IN", "OUT", "ADJUST"].includes(initialType) ? initialType : "OUT") as MovementDTO["type"],
    qty: "1",
    note: ""
  });

  const [search, setSearch] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  const [recents, setRecents] = React.useState<string[]>([]);

  React.useEffect(() => {
    setPlist(products);
  }, [products]);

  React.useEffect(() => {
    setRecents(loadRecents());
  }, []);

  async function refresh() {
    const data = await jsonFetch<{ movements: MovementDTO[] }>(`/api/movements?storeId=${storeId}`);
    setItems(data.movements);
  }

  React.useEffect(() => {
    refresh().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  React.useEffect(() => {
    // Autofocus when on quick mode
    if (view === "quick") {
      const t = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [view]);

  const selected = plist.find((p) => p.id === form.productId);

  function updateRecents(productId: string) {
    const next = [productId, ...recents.filter((id) => id !== productId)].slice(0, 8);
    setRecents(next);
    saveRecents(next);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setLoading(true);
    try {
      const resp = await jsonFetch<CreateMovementResponse>(`/api/movements`, {
        method: "POST",
        body: JSON.stringify({ storeId, ...form })
      });
      setOk("Movimiento registrado.");
      updateRecents(form.productId);

      // Update local stock hint
      if (resp?.product?.id) {
        setPlist((prev) => prev.map((p) => (p.id === resp.product!.id ? { ...p, currentStock: resp.product!.currentStock } : p)));
      }

      setForm((f) => ({ ...f, qty: "1", note: "" }));
      await refresh();

      // Keep the flow fast: jump back to search.
      setSearch("");
      searchRef.current?.focus();
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo registrar");
    } finally {
      setLoading(false);
    }
  }

  // --- Quick search helpers
  const q = search.trim().toLowerCase();
  const matches = q
    ? plist
        .filter((p) => {
          const name = p.name.toLowerCase();
          const sku = (p.sku || "").toLowerCase();
          return name.includes(q) || (sku && sku.includes(q));
        })
        .slice(0, 8)
    : [];

  function pickProduct(id: string) {
    setForm((f) => ({ ...f, productId: id }));
    setSearch("");
    updateRecents(id);
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && matches.length > 0) {
      e.preventDefault();
      pickProduct(matches[0].id);
    }
  }

  const hint = selected ? `Stock actual: ${selected.currentStock} (mínimo ${selected.stockMin})` : "";
  const qtyNum = Number(form.qty || 0);
  const warnClamp = selected && form.type === "OUT" && qtyNum > selected.currentStock;

  // --- History filters (client-side, last 50 already)
  const [filterType, setFilterType] = React.useState<"ALL" | MovementDTO["type"]>("ALL");
  const [filterQuery, setFilterQuery] = React.useState("");
  const [filterRange, setFilterRange] = React.useState<"ALL" | "TODAY" | "7D" | "30D">("7D");

  const filtered = React.useMemo(() => {
    const fq = filterQuery.trim().toLowerCase();
    const now = new Date();
    const start = new Date(now);
    if (filterRange === "TODAY") {
      start.setHours(0, 0, 0, 0);
    } else if (filterRange === "7D") {
      start.setDate(now.getDate() - 7);
    } else if (filterRange === "30D") {
      start.setDate(now.getDate() - 30);
    }

    return items.filter((m) => {
      if (filterType !== "ALL" && m.type !== filterType) return false;
      if (filterRange !== "ALL") {
        const d = new Date(m.createdAt);
        if (d < start) return false;
      }
      if (fq) {
        const name = (m.product?.name || "").toLowerCase();
        const note = (m.note || "").toLowerCase();
        if (!name.includes(fq) && !note.includes(fq)) return false;
      }
      return true;
    });
  }, [items, filterType, filterQuery, filterRange]);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Movimientos</div>
              <div className="text-xs text-slate-500">Modo rápido tipo POS o historial filtrable.</div>
            </div>
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setView("quick")}
                className={classNames(
                  "rounded-md px-2.5 py-1 text-xs font-medium",
                  view === "quick" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Rápido
              </button>
              <button
                type="button"
                onClick={() => setView("history")}
                className={classNames(
                  "rounded-md px-2.5 py-1 text-xs font-medium",
                  view === "history" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Historial
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {view === "quick" ? (
            <form className="space-y-3" onSubmit={onCreate}>
              {/* Type selector */}
              <div>
                <Label>Tipo</Label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {([
                    { v: "OUT" as const, label: "Venta", sub: "Salida" },
                    { v: "IN" as const, label: "Compra", sub: "Entrada" },
                    { v: "ADJUST" as const, label: "Ajuste", sub: "Setear" }
                  ] as const).map((t) => (
                    <button
                      key={t.v}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t.v }))}
                      className={classNames(
                        "rounded-lg border px-2 py-2 text-left",
                        form.type === t.v
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      <div className="text-sm font-semibold leading-4">{t.label}</div>
                      <div className={classNames("text-xs", form.type === t.v ? "text-slate-200" : "text-slate-500")}>
                        {t.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product search */}
              <div className="relative">
                <Label>Producto</Label>
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Buscar por nombre o SKU y Enter para elegir"
                />

                {matches.length > 0 ? (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    {matches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => pickProduct(p.id)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">{p.name}</div>
                          <div className="truncate text-xs text-slate-500">
                            {p.sku ? `SKU: ${p.sku} · ` : ""}Stock: {p.currentStock}
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">Seleccionar</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div className="text-xs font-medium text-slate-700">Seleccionado</div>
                  <div className="text-sm font-semibold text-slate-900">{selected ? selected.name : "—"}</div>
                  <div className="text-xs text-slate-500">{hint}</div>

                  {recents.length > 0 ? (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-slate-700">Recientes</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {recents
                          .map((id) => plist.find((p) => p.id === id))
                          .filter(Boolean)
                          .slice(0, 6)
                          .map((p) => (
                            <button
                              key={p!.id}
                              type="button"
                              onClick={() => pickProduct(p!.id)}
                              className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              {p!.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : null}

                  {/* fallback select (in case user doesn't want search) */}
                  <div className="mt-2">
                    <Label className="text-xs text-slate-600">Lista (opcional)</Label>
                    <Select
                      value={form.productId}
                      onChange={(e) => pickProduct(e.target.value)}
                      className="mt-1"
                    >
                      {plist.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <Label>{form.type === "ADJUST" ? "Stock final" : "Cantidad"}</Label>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    className="h-10 w-10 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    onClick={() => setForm((f) => ({ ...f, qty: String(Math.max(0, Number(f.qty || 0) - 1)) }))}
                    aria-label="Restar"
                  >
                    −
                  </button>
                  <Input
                    type="number"
                    min={0}
                    value={form.qty}
                    onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                    className="h-10"
                  />
                  <button
                    type="button"
                    className="h-10 w-10 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    onClick={() => setForm((f) => ({ ...f, qty: String(Number(f.qty || 0) + 1) }))}
                    aria-label="Sumar"
                  >
                    +
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[1, 2, 6, 12].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, qty: String(n) }))}
                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {warnClamp ? (
                  <div className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                    Estás registrando una salida mayor al stock actual. El sistema dejará el stock en 0. Si esto es una corrección por merma/rotura, agregá una nota.
                  </div>
                ) : null}
              </div>

              <div>
                <Label>Nota (opcional)</Label>
                <Input
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Ej: merma, devolución, promo..."
                />
              </div>

              {err ? <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{err}</div> : null}
              {ok ? <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">{ok}</div> : null}

              <Button disabled={loading || !form.productId} className="w-full">
                {loading ? "Guardando..." : form.type === "OUT" ? "Registrar venta" : form.type === "IN" ? "Registrar compra" : "Guardar ajuste"}
              </Button>

              <div className="text-xs text-slate-500">
                Tip: escribí el nombre/SKU, Enter para elegir y Enter de nuevo para guardar.
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
                    <option value="ALL">Todos</option>
                    <option value="OUT">Salida (venta)</option>
                    <option value="IN">Entrada (compra)</option>
                    <option value="ADJUST">Ajuste</option>
                  </Select>
                </div>
                <div>
                  <Label>Rango</Label>
                  <Select value={filterRange} onChange={(e) => setFilterRange(e.target.value as any)}>
                    <option value="TODAY">Hoy</option>
                    <option value="7D">Últimos 7 días</option>
                    <option value="30D">Últimos 30 días</option>
                    <option value="ALL">Todo</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Buscar (producto o nota)</Label>
                <Input value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} placeholder="Ej: coca, merma, promo..." />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">Mostrando {filtered.length} de {items.length} (máx 50).</div>
                <Button variant="ghost" onClick={() => refresh()} disabled={loading}>
                  Refrescar
                </Button>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  No hay movimientos con esos filtros.
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">{m.product.name}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(m.createdAt).toLocaleString()} · {m.note ? m.note : "sin nota"}
                        </div>
                      </div>
                      <Badge variant={m.type === "OUT" ? "soon" : m.type === "ADJUST" ? "neutral" : "ok"}>{fmtType(m.type)}</Badge>
                      <div className="w-24 text-right text-sm font-semibold text-slate-900">
                        {m.type === "OUT" ? "-" : m.type === "IN" ? "+" : "="}
                        {m.qty}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Últimos movimientos</div>
              <div className="text-xs text-slate-500">Vista rápida de los últimos 50 para comprobar que todo quedó bien.</div>
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
              {items.slice(0, 12).map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{m.product.name}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(m.createdAt).toLocaleString()} · {m.note ? m.note : "sin nota"}
                    </div>
                  </div>
                  <Badge variant={m.type === "OUT" ? "soon" : m.type === "ADJUST" ? "neutral" : "ok"}>{fmtType(m.type)}</Badge>
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
