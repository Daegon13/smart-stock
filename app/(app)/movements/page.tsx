import { prisma } from "@/lib/db";
import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { MovementManager } from "@/components/MovementManager";

export default async function MovementsPage() {
  const store = await getOrCreateDefaultStore();
  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    select: { id: true, name: true, unit: true, currentStock: true, stockMin: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Movimientos</h1>
        <p className="mt-1 text-sm text-slate-600">Local: {store.name}</p>
      </div>

      <MovementManager storeId={store.id} products={products} />
    </div>
  );
}
