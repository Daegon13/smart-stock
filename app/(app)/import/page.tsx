import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { ImportHub } from "@/components/ImportHub";
import { isUndoImportEnabled } from "@/lib/importGate";

export default async function ImportPage() {
  const store = await getOrCreateDefaultStore();
  const undoImportEnabled = isUndoImportEnabled();

  return (
    <div className="space-y-4" data-tour="import">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Importar ventas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Local: {store.name}. Para empezar: subí un archivo y seguí los pasos.
        </p>
      </div>

      <ImportHub storeId={store.id} undoImportEnabled={undoImportEnabled} />
    </div>
  );
}
