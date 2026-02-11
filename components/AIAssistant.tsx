"use client";

import * as React from "react";
import { Badge, Button, Card, CardContent, CardHeader, Textarea } from "@/components/ui";

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

export function AIAssistant({ storeId }: { storeId: string }) {
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

  async function send() {
    const q = input.trim();
    if (!q) return;

    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await jsonFetch<{ usedAI: boolean; answer: string }>("/api/ai/assistant", {
        method: "POST",
        body: JSON.stringify({ storeId, question: q })
      });
      setMode(res.usedAI ? "ai" : "basic");
      setMsgs((m) => [...m, { role: "assistant", text: res.answer }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", text: e?.message ?? "No pude responder." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Asistente</div>
              <div className="text-xs text-slate-500">Respuestas cortas, accionables.</div>
            </div>
            {mode === "ai" ? <Badge variant="ok">IA activa</Badge> : mode === "basic" ? <Badge variant="neutral">Modo básico</Badge> : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-slate-600">
            Tip: si está en “Modo básico”, solo falta configurar <code className="rounded bg-slate-100 px-1">OPENAI_API_KEY</code>.
          </div>
          <div className="mt-4 space-y-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInput("Armame un mensaje corto para pedir al proveedor lo urgente")}
            >
              Mensaje al proveedor
            </Button>
            <Button type="button" variant="ghost" onClick={() => setInput("¿Qué productos están en riesgo de quedarme sin stock?")}> 
              Riesgo de quiebre
            </Button>
            <Button type="button" variant="ghost" onClick={() => setInput("Dame 3 acciones para mejorar la rentabilidad esta semana")}> 
              Rentabilidad
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="text-sm font-semibold text-slate-900">Chat</div>
          <div className="text-xs text-slate-500">No guarda conversaciones todavía (MVP).</div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[420px] space-y-3 overflow-auto rounded-lg border border-slate-200 bg-white p-3">
            {msgs.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={
                    "inline-block max-w-[90%] rounded-lg px-3 py-2 text-sm " +
                    (m.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900")
                  }
                >
                  <pre className="whitespace-pre-wrap font-sans">{m.text}</pre>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              placeholder="Escribí tu pregunta..."
            />
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
