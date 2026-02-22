import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, Sticker } from "@/components/ui";
import { DemoSeedButton } from "@/components/DemoSeedButton";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { computeSuggestions } from "@/lib/stock";

type ChecklistItem = {
  label: string;
  done: boolean;
  href: string;
};

export default async function DashboardPage() {
  const store = await getOrCreateDefaultStore();
  const productCount = await prisma.product.count({ where: { storeId: store.id } });
  const unmatchedCount = await prisma.ticketLine.count({ where: { productId: null, ticket: { storeId: store.id } } });
  const orderCount = await prisma.purchaseOrder.count({ where: { storeId: store.id } });

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

  const supplierCount = new Set(products.map((p) => p.supplierId).filter(Boolean)).size;

  const suggestions = computeSuggestions(products as any, movements as any);
  const lowStockCount = suggestions.filter((s) => s.severity === "low").length;
  const soonCount = suggestions.filter((s) => s.severity === "soon").length;
  const topUrgent = suggestions.filter((s) => s.severity !== "ok").slice(0, 5);

  const checklist: ChecklistItem[] = [
    { label: "1) Cargar productos", done: productCount > 0, href: "/products" },
    { label: "2) Cargar proveedores", done: supplierCount > 0, href: "/suppliers" },
    { label: "3) Importar tickets/ventas", done: unmatchedCount >= 0 && productCount > 0, href: "/import" },
    { label: "4) Resolver sin match", done: unmatchedCount === 0, href: "/reconcile" },
    { label: "5) Crear primer pedido", done: orderCount > 0, href: "/orders" }
  ];

  const doneCount = checklist.filter((i) => i.done).length;

  return (
    <div className="space-y-6" data-tour="dashboard">
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600" />
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Sticker tone="purple">📊 Inicio</Sticker>
                <div className="text-sm font-semibold text-slate-900">Local activo: {store.name}</div>
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Para empezar rápido: Hoy → Importar ventas → Reposición → Pedidos.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/today"><Button variant="soft"><span aria-hidden>✅</span>Hoy</Button></Link>
              <Link href="/dashboard?tour=1&step=1"><Button variant="soft"><span aria-hidden>🎬</span>Tour demo</Button></Link>
              <Link href="/import"><Button variant="outline"><span aria-hidden>⬆️</span>Importar ventas</Button></Link>
              <Link href="/stock"><Button><span aria-hidden>📦</span>Ir a Reposición</Button></Link>
            </div>
          </div>

          {productCount === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200/60 bg-white/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-slate-900">Todavía no hay datos</div>
                    <div className="mt-1 text-sm text-slate-600">Carga productos + proveedores + movimientos y activa el “wow”.</div>
                  </div>
                  <DemoSeedButton />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 to-sky-500" />
          <CardHeader><div className="flex items-center justify-between"><div className="text-sm font-semibold text-slate-900">Productos</div><Sticker tone="indigo">🏷️</Sticker></div></CardHeader>
          <CardContent><div className="text-3xl font-semibold text-slate-900">{productCount}</div><p className="mt-2 text-sm text-slate-600">Catálogo cargado en el local.</p></CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardHeader><div className="flex items-center justify-between"><div className="text-sm font-semibold text-slate-900">Stock bajo</div><Sticker tone="amber">⚠️</Sticker></div></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{lowStockCount}</div>
            <p className="mt-2 text-sm text-slate-600">Productos críticos (bajo mínimo).</p>
            <p className="mt-1 text-xs text-slate-500">Reponer pronto: {soonCount}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 to-cyan-600" />
          <CardHeader><div className="flex items-center justify-between"><div className="text-sm font-semibold text-slate-900">Onboarding</div><Sticker tone="emerald">🚀</Sticker></div></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{doneCount}/{checklist.length}</div>
            <p className="mt-2 text-sm text-slate-600">Checklist de activación para llegar al primer resultado.</p>
          </CardContent>
        </Card>
      </div>

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
                  <div key={u.productId} className={"rounded-2xl border border-slate-200/60 bg-white/70 px-3 py-2 " + (u.severity === "low" ? "border-l-4 border-l-red-500" : "border-l-4 border-l-amber-500")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{u.name}</div><div className="text-xs text-slate-500">stock: {u.currentStock} · min: {u.stockMin}</div></div>
                      <div className="text-right">{u.severity === "low" ? <Badge variant="low">Crítico</Badge> : <Badge variant="soon">Reponer</Badge>}<div className="mt-1 text-xs text-slate-600">sugerido: <span className="font-semibold">{u.suggestedQty}</span></div></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/stock"><Button variant="outline"><span aria-hidden>📦</span>Reposición</Button></Link>
              <Link href="/orders"><Button variant="outline"><span aria-hidden>📝</span>Pedidos</Button></Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Checklist de activación (Tren E)</div>
            <div className="text-xs text-slate-500">Guía anti-fricción para llegar a tu primer pedido.</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checklist.map((item) => (
                <Link key={item.label} href={item.href} className="block">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    {item.done ? <Badge variant="ok">Listo</Badge> : <Badge variant="soon">Pendiente</Badge>}
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
              Consejo: cuando completes el checklist, grabá un flujo de 5 minutos: importar → conciliar → stock → orden de compra.
            </div>

            {process.env.NODE_ENV !== "production" && (
              <div className="mt-4 text-xs text-slate-500">ID tienda (debug): <code className="rounded bg-white px-1">{store.id}</code></div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
