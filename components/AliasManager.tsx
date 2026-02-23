"use client";

import * as React from "react";
import { Button, Card, CardContent, Input, Sticker } from "@/components/ui";
import { normName, normCodeLoose } from "@/lib/posNormalize";

type ProductLite = { id: string; name: string; sku: string | null };

type AliasDTO = {
  id: string;
  kind: "CODE" | "NAME";
  key: string;
  productId: string;
  product: ProductLite | null;
  createdAt: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Error");
  return data as T;
}

export function AliasManager({ storeId }: { storeId: string }) {
  const [aliases, setAliases] = React.useState<AliasDTO[]>([]);
  const [products, setProducts] = React.useState<ProductLite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [q, setQ] = React.useState("");
  const [kind, setKind] = React.useState<"" | "CODE" | "NAME">("");

  const [createKind, setCreateKind] = React.useState<"CODE" | "NAME">("CODE");
  const [createKey, setCreateKey] = React.useState("");
  const [createProductId, setCreateProductId] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({ storeId });
      if (kind) qs.set("kind", kind);
      if (q.trim()) qs.set("q", q.trim());
      const data = await fetchJson<{ aliases: AliasDTO[] }>(`/api/aliases?${qs.toString()}`);
      setAliases(data.aliases || []);
    } catch (e: any) {
      setErr(e?.message || "Error cargando alias");
      setAliases([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, kind, q]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams({ storeId });
        const data = await fetchJson<{ products: ProductLite[] }>(`/api/products?${qs.toString()}`);
        setProducts(data.products || []);
        if (!createProductId && data.products?.[0]?.id) setCreateProductId(data.products[0].id);
      } catch {
        setProducts([]);
      }
    })();
  }, [storeId, createProductId]);

  async function createAlias() {
    setErr(null);
    const key = createKey.trim();
    if (!key || !createProductId) return;

    try {
      await fetchJson(`/api/aliases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          productId: createProductId,
          kind: createKind,
          key
        })
      });
      setCreateKey("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Error creando alias");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-slate-600">Cargando…</div>
        </CardContent>
      </Card>
    );
  }

  const total = aliases.length;

  return (
    <div className="space-y-4">
      {err && (
        <Card className="border-rose-200">
          <CardContent className="p-4">
            <div className="text-sm font-semibold text-rose-700">Error</div>
            <div className="mt-1 text-sm text-rose-700/90">{err}</div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-cyan-400" />
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Sticker tone="indigo">🔖 Alias POS</Sticker>
                <div className="text-sm font-semibold text-slate-900">{total} alias</div>
              </div>
              <div className="text-sm text-slate-600">
                Si un ticket matchea mal, venís acá y corregís/borrás el alias para que la próxima importación salga bien.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value as any)}
              >
                <option value="">Todos</option>
                <option value="CODE">Por código</option>
                <option value="NAME">Por nombre</option>
              </select>
              <Input placeholder="Buscar (código, nombre, producto…)" value={q} onChange={(e) => setQ(e.target.value)} />
              <Button variant="outline" onClick={load}>
                🔄
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-slate-800 to-slate-700" />
        <CardContent className="p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Sticker tone="amber">➕</Sticker>
              <div className="text-sm font-semibold text-slate-900">Crear alias manual</div>
              <div className="text-xs text-slate-500">Útil cuando el POS manda códigos raros.</div>
            </div>

            <div className="grid w-full gap-2 md:max-w-3xl md:grid-cols-4">
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={createKind}
                onChange={(e) => setCreateKind(e.target.value as any)}
              >
                <option value="CODE">Código</option>
                <option value="NAME">Nombre</option>
              </select>

              <Input placeholder={createKind === "CODE" ? "Ej: 00012345" : "Ej: coca cola 600ml"} value={createKey} onChange={(e) => setCreateKey(e.target.value)} />

              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm md:col-span-2"
                value={createProductId}
                onChange={(e) => setCreateProductId(e.target.value)}
              >
                <option value="">Elegí producto…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.sku ? ` (${p.sku})` : ""}
                  </option>
                ))}
              </select>

              <div className="md:col-span-4">
                <Button onClick={createAlias} disabled={!createKey.trim() || !createProductId}>
                  ✅ Guardar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {aliases.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-semibold text-slate-900">Sin alias</div>
              <div className="mt-1 text-sm text-slate-600">Importá tickets o creá alias para que el matching sea automático.</div>
            </CardContent>
          </Card>
        ) : (
          aliases.map((a) => (
            <AliasRow key={a.id} alias={a} storeId={storeId} products={products} onChanged={load} />
          ))
        )}
      </div>
    </div>
  );
}

function AliasRow({
  alias,
  storeId,
  products,
  onChanged
}: {
  alias: AliasDTO;
  storeId: string;
  products: ProductLite[];
  onChanged: () => void;
}) {
  const [edit, setEdit] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [key, setKey] = React.useState(alias.key);
  const [kind, setKind] = React.useState<"CODE" | "NAME">(alias.kind);
  const [productId, setProductId] = React.useState(alias.productId);

  const labelKey = kind === "NAME" ? normName(key) : normCodeLoose(key);

  async function save() {
    setBusy(true);
    try {
      await fetchJson(`/api/aliases/${alias.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, key, kind, productId })
      });
      setEdit(false);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm("¿Borrar alias?")) return;
    setBusy(true);
    try {
      await fetchJson(`/api/aliases/${alias.id}?${new URLSearchParams({ storeId }).toString()}`, { method: "DELETE" });
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-slate-200 to-slate-100" />
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Sticker tone={alias.kind === "CODE" ? "indigo" : "emerald"}>{alias.kind === "CODE" ? "🔢 Código" : "🔤 Nombre"}</Sticker>
              <div className="text-sm font-semibold text-slate-900">{alias.key}</div>
              <div className="text-xs text-slate-500">→</div>
              <div className="text-sm text-slate-700">{alias.product?.name || "Producto"}</div>
            </div>
            <div className="text-xs text-slate-500">Normalizado: {labelKey}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setEdit((v) => !v)} disabled={busy}>
              ✏️ {edit ? "Cerrar" : "Editar"}
            </Button>
            <Button variant="outline" onClick={del} disabled={busy}>
              🗑️ Borrar
            </Button>
          </div>
        </div>

        {edit ? (
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
            >
              <option value="CODE">Código</option>
              <option value="NAME">Nombre</option>
            </select>

            <Input value={key} onChange={(e) => setKey(e.target.value)} />

            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm md:col-span-2"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="md:col-span-4">
              <Button onClick={save} disabled={busy || !key.trim() || !productId}>
                ✅ Guardar cambios
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
