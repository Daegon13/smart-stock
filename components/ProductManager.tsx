"use client";

import * as React from "react";
import { Button, Card, CardContent, CardHeader, Input, Label } from "@/components/ui";

export type ProductDTO = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  cost: number;
  price: number;
  stockMin: number;
  currentStock: number;
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

export function ProductManager({ storeId, initial }: { storeId: string; initial: ProductDTO[] }) {
  const [items, setItems] = React.useState<ProductDTO[]>(initial);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    name: "",
    sku: "",
    category: "",
    unit: "unidad",
    cost: "0",
    price: "0",
    stockMin: "0",
    currentStock: "0"
  });

  async function refresh() {
    const data = await jsonFetch<{ products: ProductDTO[] }>(`/api/products?storeId=${storeId}`);
    setItems(data.products);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await jsonFetch("/api/products", {
        method: "POST",
        body: JSON.stringify({ storeId, ...form })
      });
      setForm({ name: "", sku: "", category: "", unit: "unidad", cost: "0", price: "0", stockMin: "0", currentStock: "0" });
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo crear el producto");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    setErr(null);
    setLoading(true);
    try {
      await jsonFetch(`/api/products/${id}`, { method: "DELETE" });
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo eliminar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-5">
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="text-sm font-semibold text-slate-900">Nuevo producto</div>
          <div className="text-xs text-slate-500">MVP: alta rápida + stock mínimo.</div>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onCreate}>
            <div>
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
              </div>
              <div>
                <Label>Unidad</Label>
                <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="unidad / caja / kg" />
              </div>
            </div>
            <div>
              <Label>Categoría</Label>
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Costo</Label>
                <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
              </div>
              <div>
                <Label>Precio</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stock mínimo</Label>
                <Input type="number" value={form.stockMin} onChange={(e) => setForm((f) => ({ ...f, stockMin: e.target.value }))} />
              </div>
              <div>
                <Label>Stock actual</Label>
                <Input type="number" value={form.currentStock} onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))} />
              </div>
            </div>

            {err ? <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{err}</div> : null}

            <Button disabled={loading}>{loading ? "Guardando..." : "Crear"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader>
          <div className="text-sm font-semibold text-slate-900">Productos</div>
          <div className="text-xs text-slate-500">{items.length} en el local</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="text-sm text-slate-600">Todavía no hay productos. Cargá el primero.</div>
            ) : (
              items.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      stock: <span className={p.currentStock <= p.stockMin ? "text-red-600" : "text-slate-700"}>{p.currentStock}</span> · min: {p.stockMin}
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => onDelete(p.id)} disabled={loading}>
                    Eliminar
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
