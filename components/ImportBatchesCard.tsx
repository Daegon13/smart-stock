"use client";

import * as React from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

type Batch = {
  id: string;
  source: string;
  fileName: string | null;
  notes: string | null;
  ticketsCount: number;
  linesCount: number;
  movementsCount: number;
  skippedCount: number;
  duplicatesCount: number;
  errorCount: number;
  unmatchedLines: number;
  importedAt: string;
};

export function ImportBatchesCard({ storeId, undoImportEnabled }: { storeId: string; undoImportEnabled: boolean }) {
  const [batches, setBatches] = React.useState<Batch[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [undoing, setUndoing] = React.useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/import/batches?storeId=${encodeURIComponent(storeId)}`, {
        cache: "no-store"
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "No se pudo cargar");
      setBatches(data.batches || []);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function undoBatch(id: string) {
    if (!confirm("¿Deshacer este lote? Esto borrará tickets y revertirá movimientos de stock.")) return;
    setUndoing(id);
    setError(null);
    try {
      const res = await fetch(`/api/import/batches/${encodeURIComponent(id)}/undo`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storeId })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        if (res.status === 409) {
          throw new Error(data?.error || "No se puede deshacer porque ya hay movimientos posteriores relacionados.");
        }
        throw new Error(data?.error || `Error (${res.status})`);
      }
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setUndoing(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="min-w-0">
          <CardTitle>Historial de imports</CardTitle>
          <div className="mt-1 text-sm text-slate-600">
            Últimos lotes importados (tickets POS). Podés auditar qué entró y deshacer un lote cuando no haya movimientos posteriores.
          </div>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Actualizando…" : "Refrescar"}
        </Button>
      </CardHeader>
      <CardContent>
        {error ? <div className="text-sm text-rose-600">{error}</div> : null}

        <div className="space-y-2">
          {batches.length === 0 && !loading ? (
            <div className="text-sm text-slate-600">Todavía no hay imports de tickets.</div>
          ) : null}

          {batches.map((b) => (
            <div
              key={b.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200/60 bg-white/70 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={b.errorCount > 0 ? "amber" : "green"}>
                    {b.errorCount > 0 ? "Con observaciones" : "OK"}
                  </Badge>
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {b.fileName || "Tickets"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(b.importedAt).toLocaleString()}
                  </div>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span>Tickets: {b.ticketsCount}</span>
                  <span>· Líneas: {b.linesCount}</span>
                  <span>· Movimientos: {b.movementsCount}</span>
                  {b.duplicatesCount ? <span>· Duplicados: {b.duplicatesCount}</span> : null}
                  {b.unmatchedLines ? <span>· Sin match: {b.unmatchedLines}</span> : null}
                  {b.errorCount ? <span>· Errores: {b.errorCount}</span> : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {undoImportEnabled ? (
                  <Button
                    variant="outline"
                    onClick={() => void undoBatch(b.id)}
                    disabled={undoing === b.id || loading}
                    title="Deshace tickets y movimientos del lote. Se bloquea si hay movimientos posteriores."
                  >
                    {undoing === b.id ? "Deshaciendo…" : "Deshacer"}
                  </Button>
                ) : (
                  <div className="text-xs text-slate-500">Undo deshabilitado por configuración</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
