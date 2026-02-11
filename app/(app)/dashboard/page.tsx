import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { computeSuggestions } from "@/lib/stock";

export default async function DashboardPage() {
  const store = await getOrCreateDefaultStore();
  const productCount = await prisma.product.count({ where: { storeId: store.id } });
  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    select: { id: true, name: true, unit: true, cost: true, price: true, stockMin: true, currentStock: true, supplierId: true, category: true }
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Local activo: <span className="font-medium">{store.name}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Productos</div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{productCount}</div>
            <p className="mt-2 text-sm text-slate-600">Catálogo cargado en el local.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Stock bajo</div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{lowStockCount}</div>
            <p className="mt-2 text-sm text-slate-600">
              Productos por debajo (o igual) al stock mínimo.
            </p>
            <p className="mt-1 text-xs text-slate-500">Reponer pronto: {soonCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Siguiente paso</div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Registrá movimientos diarios y mirá la lista de compra sugerida.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/movements">
                <Button>Registrar movimiento</Button>
              </Link>
              <Link href="/stock">
                <Button variant="ghost">Ver sugerencias</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Alertas de hoy</div>
            <div className="text-xs text-slate-500">Lo más urgente primero.</div>
          </CardHeader>
          <CardContent>
            {topUrgent.length === 0 ? (
              <div className="text-sm text-slate-600">Todo en orden por ahora.</div>
            ) : (
              <div className="space-y-2">
                {topUrgent.map((u) => (
                  <div key={u.productId} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500">stock: {u.currentStock} · min: {u.stockMin}</div>
                    </div>
                    <div className="text-right">
                      {u.severity === "low" ? <Badge variant="low">Crítico</Badge> : <Badge variant="soon">Reponer</Badge>}
                      <div className="mt-1 text-xs text-slate-600">sugerido: <span className="font-semibold">{u.suggestedQty}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Link href="/stock">
                <Button variant="ghost">Abrir Stock inteligente</Button>
              </Link>
              <Link href="/assistant">
                <Button variant="ghost">Preguntar al asistente</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Setup rápido (MVP)</div>
            <div className="text-xs text-slate-500">Para que “parezca lleno” y sea usable.</div>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>Cargá 10-30 productos reales (o usá el seed).</li>
              <li>Registrá ventas diarias como “Salida” (2 min/día).</li>
              <li>Usá <span className="font-medium">Stock inteligente</span> para armar el pedido.</li>
            </ol>
            <div className="mt-4 text-xs text-slate-500">
              ID tienda (debug): <code className="rounded bg-slate-100 px-1">{store.id}</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
