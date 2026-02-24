import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, Sticker } from "@/components/ui";
import { DemoSeedButton } from "@/components/DemoSeedButton";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { isDemoAllowed } from "@/lib/demoGate";
import { computeSuggestions } from "@/lib/stock";

export default async function DashboardPage() {
  const store = await getOrCreateDefaultStore();
  const showDevBanners = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_DEV_BANNERS === "true";
  const demoAllowed = isDemoAllowed();
  const productCount = await prisma.product.count({ where: { storeId: store.id } });

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      name: true,
      unit: true,
      cost: true,
      price: true,
      stockMin: true,
      currentStock: true,
      supplierId: true,
      category: true
    }
  });

  const movements = await prisma.inventoryMovement.findMany({
    where: { storeId: store.id },
    select: { productId: true, type: true, qty: true, createdAt: true }
  });

  const suggestions = computeSuggestions(products as any, movements as any);
  const lowStockCount = suggestions.filter((s) => s.severity === "low").length;
  const soonCount = suggestions.filter((s) => s.severity === "soon").length;
  const topUrgent = suggestions.filter((s) => s.severity !== "ok").slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600" />
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Sticker tone="purple">📊 Dashboard</Sticker>
                <div className="text-sm font-semibold text-slate-900">Local activo: {store.name}</div>
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Tu resumen del local. Para empezar sin vueltas, usá “✅ Hoy” y seguí los 3 pasos.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/today">
                <Button variant="soft">
                  <span aria-hidden>✅</span>
                  Ir a Hoy
                </Button>
              </Link>
              <Link href="/import">
                <Button variant="outline">
                  <span aria-hidden>⬆️</span>
                  Importar ventas
                </Button>
              </Link>
              <Link href="/stock">
                <Button variant="outline">
                  <span aria-hidden>🛒</span>
                  Reposición
                </Button>
              </Link>
            </div>
          </div>

          {productCount === 0 && demoAllowed ? (
            <div className="mt-5 rounded-2xl border border-slate-200/60 bg-white/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Empezar en 1 clic (para grabar una demo ya mismo)</div>
                  <div className="mt-1 text-sm text-slate-600">Carga productos + proveedores + movimientos y activa el “wow”.</div>
                </div>
                <DemoSeedButton />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-3">
                  <div className="flex items-center gap-2">
                    <Sticker tone="amber">1</Sticker>
                    <div className="text-xs font-semibold text-slate-900">Datos demo</div>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">Catálogo + ventas para que el stock “se mueva”.</div>
                </div>
                <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-3">
                  <div className="flex items-center gap-2">
                    <Sticker tone="purple">2</Sticker>
                    <div className="text-xs font-semibold text-slate-900">Alertas</div>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">Críticos + sugerido de compra, listo para acción.</div>
                </div>
                <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-3">
                  <div className="flex items-center gap-2">
                    <Sticker tone="pink">3</Sticker>
                    <div className="text-xs font-semibold text-slate-900">IA + WhatsApp</div>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">Consultas al instante y pedidos por proveedor.</div>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 to-sky-500" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Productos</div>
              <Sticker tone="indigo">🏷️</Sticker>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{productCount}</div>
            <p className="mt-2 text-sm text-slate-600">Catálogo cargado en el local.</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-amber-500" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Stock bajo</div>
              <Sticker tone="amber">⚠️</Sticker>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{lowStockCount}</div>
            <p className="mt-2 text-sm text-slate-600">Productos críticos (bajo mínimo).</p>
            <p className="mt-1 text-xs text-slate-500">Reponer pronto: {soonCount}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-600 to-pink-600" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Acciones rápidas</div>
              <Sticker tone="pink">⚡</Sticker>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Lo que una pyme usa todos los días.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/movements?type=OUT">
                <Button>
                  <span aria-hidden>🛒</span>
                  Venta rápida
                </Button>
              </Link>
              <Link href="/movements?type=IN">
                <Button variant="outline">
                  <span aria-hidden>📦</span>
                  Compra
                </Button>
              </Link>
              <Link href="/movements?type=ADJUST">
                <Button variant="outline">
                  <span aria-hidden>🛠️</span>
                  Ajuste
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Alertas de hoy</div>
                <div className="text-xs text-slate-500">Lo más urgente primero.</div>
              </div>
              {topUrgent.length > 0 ? <Badge variant="low">Prioridad</Badge> : <Badge variant="ok">OK</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {topUrgent.length === 0 ? (
              <div className="text-sm text-slate-600">Todo en orden por ahora.</div>
            ) : (
              <div className="space-y-2">
                {topUrgent.map((u) => (
                  <div
                    key={u.productId}
                    className={
                      "rounded-2xl border border-slate-200/60 bg-white/70 px-3 py-2 " +
                      (u.severity === "low" ? "border-l-4 border-l-red-500" : "border-l-4 border-l-amber-500")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500">stock: {u.currentStock} · min: {u.stockMin}</div>
                      </div>
                      <div className="text-right">
                        {u.severity === "low" ? <Badge variant="low">Crítico</Badge> : <Badge variant="soon">Reponer</Badge>}
                        <div className="mt-1 text-xs text-slate-600">
                          sugerido: <span className="font-semibold">{u.suggestedQty}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/stock">
                <Button variant="outline">
                  <span aria-hidden>🛒</span>
                  Reposición
                </Button>
              </Link>
              <Link href="/today">
                <Button variant="outline">
                  <span aria-hidden>✅</span>
                  Ver Hoy
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Checklist rápido (para que impacte)</div>
            <div className="text-xs text-slate-500">Si vas a publicitarlo, esto es lo mínimo visible.</div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <Sticker tone="indigo">⬆️</Sticker>
                <span>
                  Importación Excel/CSV con mapeo (para que la gente piense “esto me ahorra horas”).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Sticker tone="amber">⚡</Sticker>
                <span>
                  Venta rápida / movimientos diarios (para que el stock tenga vida real).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Sticker tone="purple">🧠</Sticker>
                <span>
                  Lista de compra + pedidos por proveedor (WhatsApp listo).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Sticker tone="pink">✨</Sticker>
                <span>
                  Asistente IA que responda con tus datos (no texto genérico).
                </span>
              </li>
            </ol>

            {process.env.NODE_ENV !== "production" && (
              <div className="mt-4 text-xs text-slate-500">
                ID tienda (debug): <code className="rounded bg-white px-1">{store.id}</code>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
