import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { TicketReconcile } from "@/components/TicketReconcile";

export default async function ReconcilePage({
  searchParams
}: {
  searchParams?: { batch?: string };
}) {
  const store = await getOrCreateDefaultStore();

  return (
    <div className="space-y-4" data-tour="reconcile">
      <div data-tour="tickets">
        <div className="text-sm text-slate-500">Ventas importadas</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Arreglar productos no reconocidos</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Si una línea no coincide con tu catálogo, la resolvés acá una vez y la próxima se completa sola.
        </p>
      </div>

      <TicketReconcile storeId={store.id} batchId={searchParams?.batch} />
    </div>
  );
}
