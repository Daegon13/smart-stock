import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { StockIntelligence } from "@/components/StockIntelligence";

export default async function StockPage() {
  const store = await getOrCreateDefaultStore();

  return (
    <div className="space-y-4" data-tour="stock">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Stock inteligente</h1>
        <p className="mt-1 text-sm text-slate-600">
          Local: {store.name} · Genera sugerencias de reposición usando consumo reciente.
        </p>
      </div>

      <StockIntelligence storeId={store.id} storeName={store.name} />
    </div>
  );
}
