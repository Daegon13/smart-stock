import { prisma } from "@/lib/db";
import { ProductManager } from "@/components/ProductManager";

async function getOrCreateDefaultStore() {
  const existing = await prisma.store.findFirst();
  if (existing) return existing;
  return prisma.store.create({ data: { name: "Demo Store" } });
}

export default async function ProductsPage() {
  const store = await getOrCreateDefaultStore();
  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Productos</h1>
        <p className="mt-1 text-sm text-slate-600">Local: {store.name}</p>
      </div>

      <ProductManager
        storeId={store.id}
        initial={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          unit: p.unit,
          cost: p.cost,
          price: p.price,
          stockMin: p.stockMin,
          currentStock: p.currentStock
        }))}
      />
    </div>
  );
}
