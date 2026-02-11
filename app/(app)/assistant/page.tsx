import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { AIAssistant } from "@/components/AIAssistant";

export default async function AssistantPage() {
  const store = await getOrCreateDefaultStore();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Asistente IA</h1>
        <p className="mt-1 text-sm text-slate-600">Local: {store.name}</p>
      </div>

      <AIAssistant storeId={store.id} />
    </div>
  );
}
