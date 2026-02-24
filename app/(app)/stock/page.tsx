import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { isDemoAllowed } from "@/lib/demoGate";
import { StockIntelligence } from "@/components/StockIntelligence";

export default async function StockPage() {
  const store = await getOrCreateDefaultStore();
  const demoAllowed = isDemoAllowed();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reposición</h1>
        <p className="mt-1 text-sm text-slate-600">
          Local: {store.name} · Sugerencias de compra basadas en consumo reciente.
        </p>
      </div>

      <StockIntelligence storeId={store.id} storeName={store.name} demoAllowed={demoAllowed} />
    </div>
  );
}
