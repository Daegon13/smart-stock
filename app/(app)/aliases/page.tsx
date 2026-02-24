import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { AliasManager } from "@/components/AliasManager";

export default async function AliasesPage() {
  const store = await getOrCreateDefaultStore();

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-slate-500">Aprendizaje automático</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sinónimos / Códigos</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Esta es la “memoria” del sistema: cómo traduce lo que viene del POS/Excel a tu catálogo.
          Si alguna vez reconoce mal, lo corregís acá y queda solucionado.
        </p>
      </div>

      <AliasManager storeId={store.id} />
    </div>
  );
}
