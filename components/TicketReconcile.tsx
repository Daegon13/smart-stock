"use client";

import * as React from "react";
import { Button, Card, CardContent, Input, Sticker } from "@/components/ui";
import { suggestFamilyKey } from "@/lib/posNormalize";

type ProductLite = { id: string; name: string; sku: string | null; currentStock: number };

type Suggestion = { id: string; name: string; sku: string | null; score: number };

type UnmatchedLine = {
  id: string;
  sku: string | null;
  name: string | null;
  qty: number;
  unitPrice: number | null;
  lineTotal: number | null;
  ticket: {
    id: string;
    externalId: string | null;
    issuedAt: string | null;
    total: number | null;
    batchId: string | null;
  };
  suggestions: Suggestion[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Error");
  return data as T;
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString();
}

export function TicketReconcile({ storeId, batchId }: { storeId: string; batchId?: string }) {
  const [lines, setLines] = React.useState<UnmatchedLine[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [products, setProducts] = React.useState<ProductLite[]>([]);
  const [productsLoading, setProductsLoading] = React.useState(true);

  const [busyLineId, setBusyLineId] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({ storeId });
      if (batchId) qs.set("batchId", batchId);
      const data = await fetchJson<{ lines: UnmatchedLine[] }>(`/api/tickets/unmatched?${qs.toString()}`);
      setLines(data.lines);
    } catch (e: any) {
      setErr(e?.message || "Error cargando conciliación");
    } finally {
      setLoading(false);
    }
  }, [storeId, batchId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    (async () => {
      setProductsLoading(true);
      try {
        const qs = new URLSearchParams({ storeId });
        const data = await fetchJson<{ products: ProductLite[] }>(`/api/products?${qs.toString()}`);
        setProducts(data.products);
      } catch {
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    })();
  }, [storeId]);

  async function resolveLine(opts: {
    line: UnmatchedLine;
    productId: string;
    applyToSameCode: boolean;
    applyToSameName: boolean;
    applyToNameFamily: boolean;
    familyKey: string;
    saveCodeAlias: boolean;
    saveNameAlias: boolean;
  }) {
    setBusyLineId(opts.line.id);
    try {
      await fetchJson(`/api/tickets/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          lineId: opts.line.id,
          productId: opts.productId,
          applyToSameCode: opts.applyToSameCode,
          applyToSameName: opts.applyToSameName,
          applyToNameFamily: opts.applyToNameFamily,
          familyKey: opts.familyKey,
          saveCodeAlias: opts.saveCodeAlias,
          saveNameAlias: opts.saveNameAlias
        })
      });
      await reload();
    } finally {
      setBusyLineId(null);
    }
  }

  async function createProductAndResolve(line: UnmatchedLine) {
    const name = (line.name || "").trim() || `Producto ${line.sku || ""}`.trim() || "Producto";
    const sku = (line.sku || "").trim() || null;

    setBusyLineId(line.id);
    try {
      const created = await fetchJson<any>(`/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          name,
          sku,
          category: "Minimarket",
          unit: "unidad",
          cost: 0,
          price: 0,
          stockMin: 0,
          leadTimeDays: 3,
          coverageDays: 14,
          safetyStock: 0,
          currentStock: 0
        })
      });
      const productId = created?.product?.id || created?.id;
      if (!productId) throw new Error("No se pudo crear el producto");

      await fetchJson(`/api/tickets/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          lineId: line.id,
          productId,
          applyToSameCode: Boolean(line.sku),
          applyToSameName: Boolean(line.name),
          applyToNameFamily: Boolean(line.name),
          familyKey: line.name ? suggestFamilyKey(line.name) : "",
          saveCodeAlias: Boolean(line.sku),
          saveNameAlias: Boolean(line.name)
        })
      });

      await reload();
    } catch (e: any) {
      setErr(e?.message || "Error creando/asignando");
    } finally {
      setBusyLineId(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-slate-600">Cargando conciliación…</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {err && (
        <Card className="border-rose-200">
          <CardContent className="p-4">
            <div className="text-sm font-semibold text-rose-700">Error</div>
            <div className="mt-1 text-sm text-rose-700/90">{err}</div>
            <div className="mt-3">
              <Button onClick={reload}>Reintentar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-orange-400" />
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Sticker tone="rose">⚠️ Sin match</Sticker>
                <div className="text-sm font-semibold text-slate-900">{lines.length} líneas por resolver</div>
              </div>
              <div className="text-sm text-slate-600">
                Asigná el producto correcto y guardamos alias (código/nombre) para que el POS matchee la próxima.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={reload}>
                <span aria-hidden>🔄</span>
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {lines.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-semibold text-slate-900">Listo ✅</div>
            <div className="mt-1 text-sm text-slate-600">No hay líneas pendientes. Tu import de tickets quedó limpio.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lines.map((ln) => (
            <ReconcileCard
              key={ln.id}
              line={ln}
              products={products}
              productsLoading={productsLoading}
              busy={busyLineId === ln.id}
              onResolve={resolveLine}
              onCreateAndResolve={createProductAndResolve}
            />
          ))}
        </div>
      )}

      <div className="text-xs text-slate-500">
        Nota: por seguridad, las líneas sin match NO descontaron stock. Cuando las asignás acá, recién ahí se crea el movimiento OUT.
      </div>
    </div>
  );
}

function ReconcileCard({
  line,
  products,
  productsLoading,
  busy,
  onResolve,
  onCreateAndResolve
}: {
  line: UnmatchedLine;
  products: ProductLite[];
  productsLoading: boolean;
  busy: boolean;
  onResolve: (opts: {
    line: UnmatchedLine;
    productId: string;
    applyToSameCode: boolean;
    applyToSameName: boolean;
    applyToNameFamily: boolean;
    familyKey: string;
    saveCodeAlias: boolean;
    saveNameAlias: boolean;
  }) => Promise<void>;
  onCreateAndResolve: (line: UnmatchedLine) => Promise<void>;
}) {
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<string>("");
  const [applyAll, setApplyAll] = React.useState(Boolean(line.sku));
  const [applySameName, setApplySameName] = React.useState(Boolean(line.name));
  const [familyKey, setFamilyKey] = React.useState(line.name ? suggestFamilyKey(line.name) : "");
  const [applyFamily, setApplyFamily] = React.useState(Boolean(line.name));
  const [saveCode, setSaveCode] = React.useState(Boolean(line.sku));
  const [saveName, setSaveName] = React.useState(Boolean(line.name));

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 40);
    return products
      .filter((p) => {
        const name = p.name.toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        return name.includes(s) || sku.includes(s);
      })
      .slice(0, 40);
  }, [q, products]);

  const ticketLabel = line.ticket.externalId ? `Ticket ${line.ticket.externalId}` : `Ticket ${line.ticket.id.slice(0, 6)}`;

  return (
    <Card className="overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-slate-800 to-slate-700" />
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Sticker tone="rose">🧾</Sticker>
              <div className="text-sm font-semibold text-slate-900">{ticketLabel}</div>
              <div className="text-xs text-slate-500">{fmtDate(line.ticket.issuedAt)}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Sticker tone="amber">Sin match</Sticker>
                {line.sku ? (
                  <div className="text-xs text-slate-600">
                    Código: <b className="text-slate-900">{line.sku}</b>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Sin código</div>
                )}
                {line.name ? (
                  <div className="text-xs text-slate-600">
                    Nombre: <b className="text-slate-900">{line.name}</b>
                  </div>
                ) : null}
                <div className="text-xs text-slate-600">
                  Cantidad: <b className="text-slate-900">{Math.abs(line.qty)}</b>
                </div>
              </div>
            </div>

            {line.suggestions?.length ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">Sugerencias rápidas</div>
                <div className="flex flex-wrap gap-2">
                  {line.suggestions.map((s) => (
                    <Button
                      key={s.id}
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        onResolve({
                          line,
                          productId: s.id,
                          applyToSameCode: applyAll,
                          applyToSameName: applySameName,
                          applyToNameFamily: applyFamily,
                          familyKey,
                          saveCodeAlias: saveCode,
                          saveNameAlias: saveName
                        })
                      }
                      title={`Score ${Math.round(s.score * 100)}%`}
                    >
                      ✅ {s.name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="w-full max-w-md space-y-2">
            <div className="flex items-center gap-2">
              <Sticker tone="indigo">Asignar</Sticker>
              <div className="text-xs text-slate-600">Elegí el producto correcto del catálogo</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
              <div className="grid gap-2">
                <Input
                  placeholder={productsLoading ? "Cargando productos…" : "Buscar por nombre o SKU"}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  disabled={productsLoading}
                />

                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  disabled={productsLoading}
                >
                  <option value="">Seleccionar…</option>
                  {filtered.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ""}
                    </option>
                  ))}
                </select>

                <div className="grid gap-2 md:grid-cols-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} disabled={!line.sku} />
                    Aplicar a todos con este código
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={applySameName} onChange={(e) => setApplySameName(e.target.checked)} disabled={!line.name} />
                    Aplicar a todos con este nombre
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={applyFamily} onChange={(e) => setApplyFamily(e.target.checked)} disabled={!line.name} />
                    Aplicar por familia
                  </label>
                  <div className="md:col-span-2">
                    <Input
                      placeholder="Familia (ej: coca 600ml)"
                      value={familyKey}
                      onChange={(e) => setFamilyKey(e.target.value)}
                      disabled={!applyFamily || !line.name}
                    />
                    <div className="mt-1 text-[11px] text-slate-500">Tip: usá 1–3 palabras que siempre vengan en el ticket (marca + tamaño).</div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={saveCode} onChange={(e) => setSaveCode(e.target.checked)} disabled={!line.sku} />
                    Guardar alias de código
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 md:col-span-2">
                    <input type="checkbox" checked={saveName} onChange={(e) => setSaveName(e.target.checked)} disabled={!line.name} />
                    Guardar alias de nombre (normalizado)
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!selected || busy}
                    onClick={() =>
                      onResolve({
                        line,
                        productId: selected,
                        applyToSameCode: applyAll,
                        applyToSameName: applySameName,
                        applyToNameFamily: applyFamily,
                        familyKey,
                        saveCodeAlias: saveCode,
                        saveNameAlias: saveName
                      })
                    }
                  >
                    <span aria-hidden>🧩</span>
                    Asignar
                  </Button>

                  <Button variant="outline" disabled={busy} onClick={() => onCreateAndResolve(line)}>
                    <span aria-hidden>➕</span>
                    Crear producto
                  </Button>
                </div>

                <div className="text-xs text-slate-500">
                  Tip: para minimarket, el “código” suele ser el barcode del POS. Guardar alias de código hace que el matcheo sea instantáneo.
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
