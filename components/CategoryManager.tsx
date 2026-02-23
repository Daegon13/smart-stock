"use client";

import * as React from "react";
import { Button, Card, CardContent, Input, Sticker } from "@/components/ui";

type CategoryDTO = {
  id: string;
  scope: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Error");
  return data as T;
}

const SCOPES = [
  { value: "PRODUCT", label: "Productos", sticker: "🧃" },
  { value: "SUPPLIER", label: "Proveedores", sticker: "🚚" },
  { value: "ORDER", label: "Órdenes / compras", sticker: "🧾" },
  { value: "TICKET", label: "Tickets POS", sticker: "🧾" }
];

export function CategoryManager({ storeId }: { storeId: string }) {
  const [scope, setScope] = React.useState("PRODUCT");
  const [categories, setCategories] = React.useState<CategoryDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("");
  const [color, setColor] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({ storeId, scope });
      const data = await fetchJson<{ categories: CategoryDTO[] }>(`/api/categories?${qs.toString()}`);
      setCategories(data.categories || []);
    } catch (e: any) {
      setErr(e?.message || "Error cargando categorías");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, scope]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function create() {
    const n = name.trim();
    if (!n) return;
    setErr(null);
    try {
      await fetchJson(`/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, scope, name: n, icon: icon.trim() || undefined, color: color.trim() || undefined })
      });
      setName("");
      setIcon("");
      setColor("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Error creando categoría");
    }
  }

  async function del(id: string) {
    if (!confirm("¿Borrar categoría?")) return;
    setErr(null);
    try {
      await fetchJson(`/api/categories/${id}?${new URLSearchParams({ storeId }).toString()}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      setErr(e?.message || "Error borrando categoría");
    }
  }

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
        <div className="h-1 w-full bg-gradient-to-r from-fuchsia-500 to-indigo-500" />
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Sticker tone="fuchsia">🗂️</Sticker>
                <div className="text-sm font-semibold text-slate-900">Categorías por ámbito</div>
              </div>
              <div className="text-sm text-slate-600">
                Esto te permite ordenar el minimarket como en un sistema real (bebidas, lácteos, limpieza…). Te ayuda a ordenar productos y deja la base lista para compras y reportes.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                {SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              <Button variant="outline" onClick={load} disabled={loading}>
                🔄 Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-slate-800 to-slate-700" />
        <CardContent className="p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Sticker tone="amber">➕</Sticker>
              <div className="text-sm font-semibold text-slate-900">Crear categoría ({scope})</div>
            </div>

            <div className="grid w-full gap-2 md:max-w-3xl md:grid-cols-4">
              <Input placeholder="Nombre (ej: Bebidas)" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Icono (ej: 🥤)" value={icon} onChange={(e) => setIcon(e.target.value)} />
              <Input placeholder="Color (ej: indigo)" value={color} onChange={(e) => setColor(e.target.value)} />
              <Button onClick={create} disabled={!name.trim()}>
                ✅ Guardar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-600">Cargando…</div>
            </CardContent>
          </Card>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-semibold text-slate-900">Sin categorías</div>
              <div className="mt-1 text-sm text-slate-600">Creá 5–10 categorías para ordenar mejor tu operación.</div>
            </CardContent>
          </Card>
        ) : (
          categories.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-slate-200 to-slate-100" />
              <CardContent className="p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Sticker tone="indigo">{c.icon || "🗂️"}</Sticker>
                    <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500">slug: {c.slug}</div>
                    {c.color ? <div className="text-xs text-slate-500">color: {c.color}</div> : null}
                  </div>

                  <Button variant="outline" onClick={() => del(c.id)}>
                    🗑️ Borrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
