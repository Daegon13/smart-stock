import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { ImportHub } from "@/components/ImportHub";

export default async function ImportPage() {
  const store = await getOrCreateDefaultStore();

  return (
    <div className="space-y-4" data-tour="import">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Importar</h1>
        <p className="mt-1 text-sm text-slate-600">
          Local: {store.name} · Tip: si querés probar sin tu data, usá “Cargar datos demo” desde el Dashboard.
        </p>
      </div>

      <ImportHub storeId={store.id} />
    </div>
  );
}
