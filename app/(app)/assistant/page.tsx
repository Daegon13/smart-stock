import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { AIAssistant } from "@/components/AIAssistant";
import { Suspense } from "react";

export default async function AssistantPage() {
  const store = await getOrCreateDefaultStore();
  // Server-side check: if the API key exists, AI is enabled. The client UI can still fallback safely.
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Ayuda</h1>
        <p className="mt-1 text-sm text-slate-600">Local: {store.name} · Ayuda opcional (IA si está habilitada).</p>
      </div>

      {/*
        Next.js requires useSearchParams() to be rendered within a Suspense boundary
        when used in client components under a server-rendered page.
      */}
      <Suspense
        fallback={
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Cargando asistente…
          </div>
        }
      >
        <AIAssistant storeId={store.id} hasOpenAI={hasOpenAI} />
      </Suspense>
    </div>
  );
}
