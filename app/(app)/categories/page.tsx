import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { CategoryManager } from "@/components/CategoryManager";

export default async function CategoriesPage() {
  const store = await getOrCreateDefaultStore();

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-slate-500">Minimarket • Organización</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Categorías</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Cargá categorías reales (bebidas, lácteos, limpieza…) para ordenar mejor el negocio y dejar base para reportes y compras.
        </p>
      </div>

      <CategoryManager storeId={store.id} />
    </div>
  );
}
