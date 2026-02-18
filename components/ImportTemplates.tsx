"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { Button, Card, CardContent } from "@/components/ui";
import { templateRows } from "@/lib/importMapping";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

function toCsv(headers: string[], rows: string[][]) {
  const esc = (v: string) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
  return lines.join("\n");
}

export function ImportTemplates() {
  const { headers, rows } = React.useMemo(() => templateRows(), []);

  const downloadCsv = () => {
    const csv = toCsv(headers, rows);
    downloadBlob("plantilla_stock_inteligente.csv", new Blob([csv], { type: "text/csv;charset=utf-8" }));
  };

  const downloadXlsx = () => {
    const aoa = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(12, Math.min(28, h.length + 6)) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    downloadBlob(
      "plantilla_stock_inteligente.xlsx",
      new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
    );
  };

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-2 p-3">
        <div className="text-sm text-slate-700">
          ¿No tenés archivo a mano? Bajate una plantilla lista para pegar tus productos.
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={downloadCsv}>
            Descargar CSV
          </Button>
          <Button variant="ghost" onClick={downloadXlsx}>
            Descargar Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
