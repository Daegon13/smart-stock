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
      <div>
        <div className="text-sm text-slate-500">Minimarket • Ventas POS</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Conciliar “sin match”</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Cuando importás tickets, algunas líneas pueden venir con un código/nombre que no existe en tu catálogo. Acá las asignás una sola vez y el
          sistema guarda un alias para que la próxima importación matchee sola.
        </p>
      </div>

      <TicketReconcile storeId={store.id} batchId={searchParams?.batch} />
    </div>
  );
}
