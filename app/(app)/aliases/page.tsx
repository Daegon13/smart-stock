import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { AliasManager } from "@/components/AliasManager";

export default async function AliasesPage() {
  const store = await getOrCreateDefaultStore();

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-slate-500">Minimarket • Matching POS</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Aliases (códigos y nombres)</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Acá se ve la “memoria” del sistema: cómo traduce lo que viene en el ticket del POS a tu catálogo.
          Si alguna vez matchea mal, lo corregís y listo.
        </p>
      </div>

      <AliasManager storeId={store.id} />
    </div>
  );
}
