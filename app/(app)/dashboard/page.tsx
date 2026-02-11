import Link from "next/link";
import { Card, CardContent, CardHeader, Button } from "@/components/ui";
import { prisma } from "@/lib/db";

async function getOrCreateDefaultStore() {
  const existing = await prisma.store.findFirst();
  if (existing) return existing;
  return prisma.store.create({ data: { name: "Demo Store" } });
}

export default async function DashboardPage() {
  const store = await getOrCreateDefaultStore();
  const productCount = await prisma.product.count({ where: { storeId: store.id } });
  const productsForLow = await prisma.product.findMany({
    where: { storeId: store.id },
    select: { currentStock: true, stockMin: true }
  });
  const lowStockCount = productsForLow.filter((p) => p.currentStock <= p.stockMin).length;

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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Siguiente paso</div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Cargá productos y seguimos con sugerencias de compra.</p>
            <div className="mt-3">
              <Link href="/products">
                <Button>Ir a Productos</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="text-sm font-semibold text-slate-900">ID de tienda (para debug)</div>
        </CardHeader>
        <CardContent>
          <code className="rounded bg-slate-100 px-2 py-1 text-xs">{store.id}</code>
          <p className="mt-2 text-xs text-slate-500">
            En el MVP usamos una tienda por defecto. Luego agregamos multi-local + usuarios.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
