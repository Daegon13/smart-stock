import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { TicketReconcile } from "@/components/TicketReconcile";

export default async function ReconcilePage({
  searchParams
}: {
  searchParams?: { batch?: string };
}) {
  const store = await getOrCreateDefaultStore();

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-slate-500">Ventas importadas</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Arreglar productos no reconocidos</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Si importaste ventas y algo no se reconoció, lo asociás una sola vez. El sistema aprende (guarda sinónimos) y la próxima vez lo reconoce solo.
        </p>
      </div>

      <TicketReconcile storeId={store.id} batchId={searchParams?.batch} />
    </div>
  );
}
