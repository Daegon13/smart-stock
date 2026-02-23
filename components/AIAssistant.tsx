"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, Input, Label, Select, Sticker, Textarea } from "@/components/ui";

type Msg = { role: "user" | "assistant"; text: string };

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json" },
    ...init
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status}`);
  }
  return (await res.json()) as T;
}

export function AIAssistant({ storeId, hasOpenAI }: { storeId: string; hasOpenAI: boolean }) {
  const [msgs, setMsgs] = React.useState<Msg[]>([
    {
      role: "assistant",
      text:
        "Preguntame cosas como: \"¿Qué debo comprar hoy?\", \"¿Qué productos están críticos?\" o \"Armame un mensaje para el proveedor\"."
    }
  ]);
  const [input, setInput] = React.useState("¿Qué debería comprar hoy?");
  const [loading, setLoading] = React.useState(false);
  const [mode, setMode] = React.useState<"unknown" | "ai" | "basic">("unknown");
  const [lastModelUsed, setLastModelUsed] = React.useState<string>("");
  const [modelMode, setModelMode] = React.useState<"auto" | "preset" | "custom">("auto");
  const [presetModel, setPresetModel] = React.useState("gpt-5");
  const [customModel, setCustomModel] = React.useState("");

  const sp = useSearchParams();
  const qParam = sp.get("q");

  React.useEffect(() => {
    if (qParam && qParam.trim()) setInput(qParam);
  }, [qParam]);

  const modelToSend = React.useMemo(() => {
    if (modelMode === "auto") return undefined;
    if (modelMode === "custom") return customModel.trim() || undefined;
    return presetModel;
  }, [modelMode, presetModel, customModel]);

  async function send() {
    const q = input.trim();
    if (!q) return;

    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await jsonFetch<{ usedAI: boolean; answer: string; modelUsed?: string }>("/api/ai/assistant", {
        method: "POST",
        body: JSON.stringify({ storeId, question: q, model: modelToSend })
      });
      setMode(res.usedAI ? "ai" : "basic");
      if (res.modelUsed) setLastModelUsed(res.modelUsed);
      setMsgs((m) => [...m, { role: "assistant", text: res.answer }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", text: e?.message ?? "No pude responder." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-fuchsia-600 to-indigo-600" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sticker tone="pink">✨ IA</Sticker>
                <div className="text-sm font-semibold text-slate-900">Asistente</div>
              </div>
              <div className="text-xs text-slate-500">Respuestas cortas y accionables.</div>
            </div>
            {mode === "ai" ? (
              <Badge variant="ok">IA activa</Badge>
            ) : mode === "basic" ? (
              <Badge variant="neutral">Modo básico</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-slate-600">{hasOpenAI ? "Ayuda con IA activa." : "Ayuda básica activa. También podés usarla sin IA."}</div>
          {lastModelUsed ? (
            <div className="mt-2 text-xs text-slate-600">
              Modelo usado: <code className="rounded bg-white px-1">{lastModelUsed}</code>
            </div>
          ) : null}

          <details className="mt-4 rounded-2xl border border-slate-200/60 bg-white/60 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-slate-700">Avanzado: modelo</summary>
            <div className="mt-2 grid gap-2">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={modelMode === "auto" ? "primary" : "outline"}
                  className="w-full"
                  onClick={() => setModelMode("auto")}
                >
                  Auto
                </Button>
                <Button
                  type="button"
                  variant={modelMode === "preset" ? "primary" : "outline"}
                  className="w-full"
                  onClick={() => setModelMode("preset")}
                >
                  Lista
                </Button>
                <Button
                  type="button"
                  variant={modelMode === "custom" ? "primary" : "outline"}
                  className="w-full"
                  onClick={() => setModelMode("custom")}
                >
                  Manual
                </Button>
              </div>

              {modelMode === "auto" ? (
                <div className="text-xs text-slate-600">
                  Usa <code className="rounded bg-white px-1">OPENAI_MODEL</code> si existe, o un default.
                </div>
              ) : null}

              {modelMode === "preset" ? (
                <div className="grid gap-1">
                  <Label className="text-xs">Elegí un modelo</Label>
                  <Select value={presetModel} onChange={(e) => setPresetModel(e.target.value)}>
                    <option value="gpt-5">gpt-5</option>
                    <option value="gpt-5.2">gpt-5.2</option>
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                  </Select>
                  <div className="text-[11px] text-slate-600">Si tu cuenta no tiene acceso, la API va a devolver error.</div>
                </div>
              ) : null}

              {modelMode === "custom" ? (
                <div className="grid gap-1">
                  <Label className="text-xs">Nombre del modelo</Label>
                  <Input
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="Ej: gpt-5, gpt-4o-mini..."
                  />
                  <div className="text-[11px] text-slate-600">Se envía tal cual. Solo letras/números, guiones y puntos.</div>
                </div>
              ) : null}
            </div>
          </details>

          <div className="mt-4 space-y-2">
            <Button type="button" variant="outline" onClick={() => setInput("Armame un mensaje corto para pedir al proveedor lo urgente")}>
              📨 Mensaje al proveedor
            </Button>
            <Button type="button" variant="outline" onClick={() => setInput("¿Qué productos están en riesgo de quedarme sin stock?")}
            >
              ⚠️ Riesgo de quiebre
            </Button>
            <Button type="button" variant="outline" onClick={() => setInput("Dame 3 acciones para mejorar la rentabilidad esta semana")}
            >
              📈 Rentabilidad
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600" />
        <CardHeader>
          <div className="text-sm font-semibold text-slate-900">Chat</div>
          <div className="text-xs text-slate-500">No guarda conversaciones todavía.</div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[420px] space-y-3 overflow-auto rounded-2xl border border-slate-200/60 bg-white/70 p-3">
            {msgs.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={
                    "inline-block max-w-[90%] rounded-2xl px-3 py-2 text-sm shadow-sm " +
                    (m.role === "user"
                      ? "bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white"
                      : "bg-slate-100 text-slate-900")
                  }
                >
                  <pre className="whitespace-pre-wrap font-sans">{m.text}</pre>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} placeholder="Escribí tu pregunta..." />
            <div className="flex items-center gap-2">
              <Button onClick={send} disabled={loading}>
                {loading ? "Pensando..." : "Enviar"}
              </Button>
              <Button variant="ghost" type="button" onClick={() => setMsgs(msgs.slice(0, 1))}>
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
