import { prisma } from "@/lib/db";
import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { isDemoAllowed } from "@/lib/demoGate";
import { ProductManager } from "@/components/ProductManager";

export default async function ProductsPage() {
  const store = await getOrCreateDefaultStore();
  const demoAllowed = isDemoAllowed();

  // Tipado explícito para evitar "implicit any" en builds donde Prisma Client types todavía no existan.
  type ProductRow = {
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

  const products = (await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" }
  })) as ProductRow[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Productos</h1>
        <p className="mt-1 text-sm text-slate-600">Local: {store.name}</p>
      </div>

      <ProductManager
        storeId={store.id}
        demoAllowed={demoAllowed}
        initial={products.map((p: ProductRow) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          categoryId: p.categoryId,
          unit: p.unit,
          cost: p.cost,
          price: p.price,

          stockMin: p.stockMin,
          leadTimeDays: p.leadTimeDays,
          coverageDays: p.coverageDays,
          safetyStock: p.safetyStock,

          currentStock: p.currentStock
        }))}
      />
    </div>
  );
}
