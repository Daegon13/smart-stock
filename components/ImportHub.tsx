"use client";

import * as React from "react";
import { Button, Card, CardContent, Sticker } from "@/components/ui";
import { CsvImportWizard } from "@/components/CsvImportWizard";
import { XlsxImportWizard } from "@/components/XlsxImportWizard";
import { ImportTemplates } from "@/components/ImportTemplates";
import { TicketImportWizard } from "@/components/TicketImportWizard";
import { ImportBatchesCard } from "@/components/ImportBatchesCard";

export function ImportHub({ storeId, undoImportEnabled }: { storeId: string; undoImportEnabled: boolean }) {
  const [tab, setTab] = React.useState<"csv" | "xlsx" | "tickets">("xlsx");

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600" />
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Sticker tone="indigo">⬆️ Importar</Sticker>
                <div className="text-sm font-semibold text-slate-900">Importá tu info en 30 segundos</div>
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Catálogo (Excel/CSV) o ventas del POS (tickets) → listo. Sin formateos raros.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant={tab === "csv" ? "primary" : "outline"} onClick={() => setTab("csv")}>
                <span aria-hidden>🧾</span>
                CSV
              </Button>
              <Button variant={tab === "xlsx" ? "primary" : "outline"} onClick={() => setTab("xlsx")}>
                <span aria-hidden>📗</span>
                Excel (.xlsx)
              </Button>
              <Button variant={tab === "tickets" ? "primary" : "outline"} onClick={() => setTab("tickets")}>
                <span aria-hidden>🧾</span>
                Tickets POS
              </Button>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-3">
              <div className="flex items-center gap-2">
                <Sticker tone="amber">1</Sticker>
                <div className="text-xs font-semibold text-slate-900">Subí</div>
              </div>
              <div className="mt-1 text-sm text-slate-600">Tu archivo Excel/CSV o export del POS.</div>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-3">
              <div className="flex items-center gap-2">
                <Sticker tone="purple">2</Sticker>
                <div className="text-xs font-semibold text-slate-900">Mapeá</div>
              </div>
              <div className="mt-1 text-sm text-slate-600">Columnas (con sugerencias + IA).</div>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-3">
              <div className="flex items-center gap-2">
                <Sticker tone="emerald">3</Sticker>
                <div className="text-xs font-semibold text-slate-900">Acción</div>
              </div>
              <div className="mt-1 text-sm text-slate-600">Catálogo listo o stock descontado.</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ImportTemplates />

      {tab === "csv" ? (
        <CsvImportWizard storeId={storeId} />
      ) : tab === "xlsx" ? (
        <XlsxImportWizard storeId={storeId} />
      ) : (
        <TicketImportWizard storeId={storeId} />
      )}

      <ImportBatchesCard storeId={storeId} undoImportEnabled={undoImportEnabled} />
    </div>
  );
}
