"use client";

import * as React from "react";
import { Button, Card, CardContent, CardHeader, Input, Label } from "@/components/ui";
import { DemoSeedButton } from "@/components/DemoSeedButton";

export type ProductDTO = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  categoryId: string | null;
  unit: string;
  cost: number;
  price: number;

  stockMin: number;
  leadTimeDays: number;
  coverageDays: number;
  safetyStock: number;

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

const defaults = {
  name: "",
  sku: "",
  category: "",
  categoryId: "",
  unit: "unidad",
  cost: "0",
  price: "0",
  stockMin: "0",
  leadTimeDays: "3",
  coverageDays: "14",
  safetyStock: "0",
  currentStock: "0"
};

export function ProductManager({ storeId, initial, demoAllowed }: { storeId: string; initial: ProductDTO[]; demoAllowed: boolean }) {
  const [items, setItems] = React.useState<ProductDTO[]>(initial);
const [cats, setCats] = React.useState<{ id: string; name: string; icon: string | null }[]>([]);
  const [newCat, setNewCat] = React.useState("");

  async function refreshCats() {
    const data = await jsonFetch<{ categories: { id: string; name: string; icon: string | null }[] }>(
      `/api/categories?${new URLSearchParams({ storeId, scope: "PRODUCT" }).toString()}`
    );
    setCats(data.categories || []);
  }
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const isEditing = !!editingId;

  const [form, setForm] = React.useState({ ...defaults });
  async function createCategoryQuick() {
    const name = newCat.trim();
    if (!name) return;
    await jsonFetch(`/api/categories`, {
      method: "POST",
      body: JSON.stringify({ storeId, scope: "PRODUCT", name })
    });
    setNewCat("");
    await refreshCats();
  }



  async function refresh() {
    const data = await jsonFetch<{ products: ProductDTO[] }>(`/api/products?storeId=${storeId}`);
    setItems(data.products);
  }

  function startEdit(p: ProductDTO) {
    setErr(null);
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      category: p.category ?? "",
      categoryId: p.categoryId ?? "",
      unit: p.unit ?? "unidad",
      cost: String(p.cost ?? 0),
      price: String(p.price ?? 0),
      stockMin: String(p.stockMin ?? 0),
      leadTimeDays: String(p.leadTimeDays ?? 3),
      coverageDays: String(p.coverageDays ?? 14),
      safetyStock: String(p.safetyStock ?? 0),
      currentStock: String(p.currentStock ?? 0)
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...defaults });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      if (isEditing && editingId) {
        await jsonFetch(`/api/products/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({ ...form })
        });
        cancelEdit();
      } else {
        await jsonFetch("/api/products", {
          method: "POST",
          body: JSON.stringify({ storeId, ...form })
        });
        setForm({ ...defaults });
      }

      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? (isEditing ? "No se pudo actualizar" : "No se pudo crear el producto"));
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    setErr(null);
    setLoading(true);
    try {
      await jsonFetch(`/api/products/${id}`, { method: "DELETE" });
      if (editingId === id) cancelEdit();
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
          <div className="text-sm font-semibold text-slate-900">{isEditing ? "Editar producto" : "Nuevo producto"}</div>
          <div className="text-xs text-slate-500">
            Configurá lead time, cobertura y colchón por producto para mejorar el stock inteligente.
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
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
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="unidad / caja / kg"
                />
              </div>
            </div>

            <div>
              <Label>Categoría</Label>
              <div className="mt-1 grid gap-2 md:grid-cols-2">
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                >
                  <option value="">(Sin categoría)</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {(c.icon || "🗂️") + " " + c.name}
                    </option>
                  ))}
                </select>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="o texto libre (legacy)"
                />
              </div>

              <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
                <Input placeholder="Nueva categoría rápida (ej: Bebidas)" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
                <Button variant="outline" onClick={createCategoryQuick} disabled={!newCat.trim()}>
                  ➕ Crear
                </Button>
                <Button variant="outline" asChild>
                  <a href="/categories">🗂️ Gestionar</a>
                </Button>
              </div>
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

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Lead time (días)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.leadTimeDays}
                  onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
                />
              </div>
              <div>
                <Label>Cobertura (días)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.coverageDays}
                  onChange={(e) => setForm((f) => ({ ...f, coverageDays: e.target.value }))}
                />
              </div>
              <div>
                <Label>Colchón (unid.)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.safetyStock}
                  onChange={(e) => setForm((f) => ({ ...f, safetyStock: e.target.value }))}
                />
              </div>
            </div>

            {err ? <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{err}</div> : null}

            <div className="flex items-center gap-2">
              <Button disabled={loading}>{loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear"}</Button>
              {isEditing ? (
                <Button type="button" variant="ghost" onClick={cancelEdit} disabled={loading}>
                  Cancelar
                </Button>
              ) : null}
            </div>
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
              <div className="space-y-2">
                <div className="text-sm text-slate-600">Todavía no hay productos.</div>
                <div className="text-xs text-slate-500">Tip: cargá tus primeros productos para activar reposición y pedidos.</div>
                {demoAllowed ? <DemoSeedButton variant="ghost" /> : null}
              </div>
            ) : (
              items.map((p) => (
                <div
                  key={p.id}
                  className={[
                    "flex items-center gap-3 rounded-lg border px-3 py-2",
                    editingId === p.id ? "border-slate-900 bg-white" : "border-slate-200 bg-slate-50"
                  ].join(" ")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{p.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      stock: <span className={p.currentStock <= p.stockMin ? "text-red-600" : "text-slate-700"}>{p.currentStock}</span>
                      {" "}· min: {p.stockMin}
                      {" "}· lead: {p.leadTimeDays}d
                      {" "}· cobertura: {p.coverageDays}d
                      {" "}· colchón: {p.safetyStock}u
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => startEdit(p)} disabled={loading}>
                      Editar
                    </Button>
                    <Button variant="ghost" onClick={() => onDelete(p.id)} disabled={loading}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
