import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { AliasManager } from "@/components/AliasManager";

export default async function AliasesPage() {
  const store = await getOrCreateDefaultStore();

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-slate-500">Ventas importadas</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sinónimos / Códigos</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Acá se guarda la memoria de equivalencias para reconocer productos automáticamente.
        </p>
      </div>

      <AliasManager storeId={store.id} />
    </div>
  );
}
