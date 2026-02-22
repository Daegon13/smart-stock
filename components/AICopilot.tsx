  "use client";

  import { useMemo, useState } from "react";
  import { Badge, Button, Card, CardContent, CardHeader, Input, Select, Sticker } from "@/components/ui";

  type Action =
    | { type: "create_purchase_order"; title?: string; supplierId?: string | null; supplierName?: string | null; notes?: string | null; items: Array<{ productId: string; qtyOrdered: number; unitCost?: number | null; note?: string | null }> }
    | { type: "set_replenishment_params"; updates: Array<{ productId: string; stockMin?: number; leadTimeDays?: number; coverageDays?: number; safetyStock?: number }> }
    | { type: "create_category"; scope: string; name: string; color?: string | null; icon?: string | null }
    | { type: "add_alias"; productId: string; kind: "CODE" | "NAME"; key: string }
    | { type: "none" };

  type CopilotResponse = {
    usedAI: boolean;
    modelUsed: string;
    message: string;
    actions: Action[];
    context?: any;
    error?: string;
  };

  type ExecuteResponse = {
    ok: boolean;
    results: Array<{ action: string; ok: boolean; detail?: any; error?: string }>;
  };

  export function AICopilot({ storeId }: { storeId: string }) {
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [resp, setResp] = useState<CopilotResponse | null>(null);
    const [execResp, setExecResp] = useState<ExecuteResponse | null>(null);

    const modelOptions = useMemo(
      () => [
        { value: "", label: "Auto (OPENAI_MODEL)" },
        { value: "gpt-5", label: "gpt-5" },
        { value: "gpt-4o", label: "gpt-4o" },
        { value: "gpt-4o-mini", label: "gpt-4o-mini" }
      ],
      []
    );
    const [model, setModel] = useState("");

    async function ask() {
      if (!question.trim()) return;
      setLoading(true);
      setExecResp(null);

      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, question, model: model || undefined })
      }).catch(() => null);

      const data = (await res?.json().catch(() => null)) as CopilotResponse | null;
      setResp(data);
      setLoading(false);
    }

    async function executeActions() {
      if (!resp?.actions?.length) return;
      setExecuting(true);

      const res = await fetch("/api/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, actions: resp.actions })
      }).catch(() => null);

      const data = (await res?.json().catch(() => null)) as ExecuteResponse | null;
      setExecResp(data);
      setExecuting(false);
    }

    const actionable = (resp?.actions || []).filter((a) => a.type !== "none");

    return (
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600" />
          <CardHeader>
            <h3 className="text-xl font-semibold leading-none tracking-tight">Copiloto IA (operaciones)</h3>
            <p className="text-sm text-muted-foreground">Pedile que arme pedidos, detecte problemas y te prepare acciones listas para ejecutar (con revisión).</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="flex-1">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ej: Armame un pedido para cubrir 10 días y proponé ajustar mínimos en bebidas."
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={model} onChange={(e) => setModel((e.target as HTMLSelectElement).value)}>
                  {modelOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <Button onClick={ask} disabled={loading}>
                  <span aria-hidden>🧠</span>
                  {loading ? "Pensando..." : "Analizar"}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <Sticker tone="purple">Tip</Sticker>
              Probá: “Revisá quiebres de stock”, “Armar pedido por proveedor”, “Crear categoría Snacks”, “Agregá alias para coca 600”.
            </div>
          </CardContent>
        </Card>

        {resp && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold leading-none tracking-tight">Respuesta</span>
                <Badge tone={resp.usedAI ? "green" : "amber"}>{resp.usedAI ? "IA activa" : "Fallback"}</Badge>
                <Badge tone="slate">{resp.modelUsed}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Si ves acciones sugeridas, podés ejecutarlas para acelerar tareas repetitivas.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="whitespace-pre-wrap text-sm text-slate-800">{resp.message}</div>

              {resp.error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {resp.error}
                </div>
              )}

              {actionable.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sticker tone="blue">🧩 Acciones</Sticker>
                      <div className="text-sm text-slate-600">Revisá y ejecutá (si tu rol lo permite).</div>
                    </div>
                    <Button onClick={executeActions} disabled={executing} variant="soft">
                      <span aria-hidden>⚡</span>
                      {executing ? "Ejecutando..." : "Ejecutar acciones"}
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {actionable.map((a, idx) => (
                      <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-slate-900">
                            {a.type === "create_purchase_order" && "🧾 Crear orden de compra"}
                            {a.type === "set_replenishment_params" && "📈 Ajustar parámetros de reposición"}
                            {a.type === "create_category" && "🏷️ Crear categoría"}
                            {a.type === "add_alias" && "🔁 Agregar alias"}
                          </div>
                          <Badge tone="slate">#{idx + 1}</Badge>
                        </div>

                        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-2 text-xs text-slate-700">
{JSON.stringify(a, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {execResp && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sticker tone={execResp.ok ? "green" : "amber"}>🧾 Resultado</Sticker>
                    <div className="text-sm text-slate-600">Acciones ejecutadas (o bloqueadas por permisos).</div>
                  </div>

                  <div className="space-y-2">
                    {execResp.results.map((r, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border p-3 text-sm ${
                          r.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        <div className="font-semibold">{r.action}</div>
                        {r.error ? <div className="mt-1">{r.error}</div> : <pre className="mt-1 whitespace-pre-wrap text-xs">{JSON.stringify(r.detail, null, 2)}</pre>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
