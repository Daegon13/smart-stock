"use client";

import * as React from "react";
import { Badge, Button, Card, CardContent, CardHeader, Input, Label, Select } from "@/components/ui";
import { detectDelimiter, parseCsv } from "@/lib/csv";
import { guessTicketMapping, type TicketMapping, type TicketMappingKey } from "@/lib/ticketMapping";

type ImportResult = {
  batchId: string;
  ticketsCreated: number;
  ticketsDuplicated: number;
  linesCreated: number;
  movementsCreated: number;
  unmatchedLines: number;
  skippedLines: number;
  errors: Array<{ row: number; message: string }>;
  topSold: Array<{ productId: string; name: string; qty: number }>;
};

function toCsv(headers: string[], rows: string[][]) {
  const esc = (v: string) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

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

export function TicketImportWizard({ storeId }: { storeId: string }) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = React.useState<string>("");
  const [csvText, setCsvText] = React.useState<string>("");
  const [hasHeader, setHasHeader] = React.useState(true);
  const [delimiter, setDelimiter] = React.useState<string>(",");

  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<string[][]>([]);

  const [mapping, setMapping] = React.useState<TicketMapping>({
    ticketId: "",
    issuedAt: "",
    sku: "",
    name: "",
    qty: "",
    unitPrice: "",
    lineTotal: "",
    ticketTotal: ""
  });

  const [mappingTouched, setMappingTouched] = React.useState(false);
  const [suggestBusy, setSuggestBusy] = React.useState(false);
  const [suggestNotes, setSuggestNotes] = React.useState<string[]>([]);
  const [suggestConfidence, setSuggestConfidence] = React.useState<Record<TicketMappingKey, number>>({
    ticketId: 0,
    issuedAt: 0,
    sku: 0,
    name: 0,
    qty: 0,
    unitPrice: 0,
    lineTotal: 0,
    ticketTotal: 0
  });
  const [aiModel, setAiModel] = React.useState<string>("");

  const [previewLimit] = React.useState(15);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<string>("");

  const ticketTemplate = React.useMemo(() => {
    const headers = ["ticket_id", "fecha_hora", "sku", "producto", "cantidad", "precio_unitario", "total_linea", "total_ticket"];
    const rows = [
      ["A-000123", "12/02/2026 18:42", "7791234567890", "Coca Cola 2L", "1", "120", "120", "540"],
      ["A-000123", "12/02/2026 18:42", "7730001112223", "Pan lactal", "2", "210", "420", "540"],
      ["A-000123", "12/02/2026 18:42", "", "Bolsa", "1", "0", "0", "540"]
    ];
    return { headers, rows };
  }, []);

  const downloadTemplate = () => {
    const csv = toCsv(ticketTemplate.headers, ticketTemplate.rows);
    downloadBlob("plantilla_tickets_minimarket.csv", new Blob([csv], { type: "text/csv;charset=utf-8" }));
  };

  const onPick = async (f: File | null) => {
    setError("");
    setResult(null);
    setSuggestNotes([]);
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    setCsvText(text);
    const d = detectDelimiter(text);
    setDelimiter(d);

    const parsed = parseCsv(text, { delimiter: d, hasHeader: true, maxRows: 5000 });
    setHasHeader(true);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    const guess = guessTicketMapping(parsed.headers, parsed.rows);
    setMapping(guess.mapping);
    setSuggestConfidence(guess.confidence);
    setSuggestNotes(["Sugerencia automática aplicada.", ...guess.notes]);
    setMappingTouched(false);
    setStep(2);
  };

  const reparse = React.useCallback(() => {
    if (!csvText) return;
    const parsed = parseCsv(csvText, { delimiter, hasHeader, maxRows: 5000 });
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping((m) => {
      const next = { ...m };
      (Object.keys(next) as TicketMappingKey[]).forEach((k) => {
        const col = next[k];
        if (col && !parsed.headers.includes(col)) (next as any)[k] = "";
      });
      return next;
    });

    if (!mappingTouched) {
      const guess = guessTicketMapping(parsed.headers, parsed.rows);
      setMapping(guess.mapping);
      setSuggestConfidence(guess.confidence);
      setSuggestNotes(["Sugerencia automática actualizada.", ...guess.notes]);
    }
  }, [csvText, delimiter, hasHeader, mappingTouched]);

  React.useEffect(() => {
    reparse();
  }, [reparse]);

  const applySmartGuess = () => {
    const guess = guessTicketMapping(headers, rows);
    setMapping(guess.mapping);
    setSuggestConfidence(guess.confidence);
    setSuggestNotes(["Sugerencia automática aplicada.", ...guess.notes]);
    setMappingTouched(false);
  };

  const suggestWithAI = async () => {
    setSuggestBusy(true);
    setSuggestNotes([]);
    try {
      const res = await fetch("/api/import/tickets/suggest-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers, rows: rows.slice(0, 25), model: aiModel.trim() || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        setSuggestNotes([data?.error?.message || "No pude sugerir el mapeo con IA."]);
        setSuggestBusy(false);
        return;
      }
      if (data?.mapping) setMapping(data.mapping as TicketMapping);
      if (data?.confidence) setSuggestConfidence(data.confidence as Record<TicketMappingKey, number>);
      if (Array.isArray(data?.notes)) setSuggestNotes(data.notes.map((x: any) => String(x)));
      setMappingTouched(false);
      setSuggestBusy(false);
    } catch (e: any) {
      setSuggestNotes([e?.message || "Error inesperado"]);
      setSuggestBusy(false);
    }
  };

  const mappedPreview = React.useMemo(() => {
    const idxOf = (h: string) => headers.findIndex((x) => x === h);
    const get = (r: string[], key: TicketMappingKey) => {
      const col = mapping[key];
      if (!col) return "";
      const idx = idxOf(col);
      return idx >= 0 ? String(r[idx] ?? "") : "";
    };

    const take = rows.slice(0, previewLimit);
    const view = take.map((r) => ({
      ticketId: get(r, "ticketId"),
      issuedAt: get(r, "issuedAt"),
      sku: get(r, "sku"),
      name: get(r, "name"),
      qty: get(r, "qty"),
      unitPrice: get(r, "unitPrice")
    }));

    const issues: string[] = [];
    if (!mapping.qty) issues.push("Mapeá Cantidad");
    if (!mapping.sku && !mapping.name) issues.push("Mapeá SKU/Código o Nombre del producto");

    let emptyCore = 0;
    for (const r of rows) {
      const sku = get(r, "sku").trim();
      const name = get(r, "name").trim();
      const qty = get(r, "qty").trim();
      if ((!sku && !name) || !qty) emptyCore++;
    }

    return { view, issues, emptyCore };
  }, [headers, rows, mapping, previewLimit]);

  const canContinueToPreview = !!csvText && headers.length > 0;

  const doImport = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/import/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, csvText, delimiter, hasHeader, mapping, fileName })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || data?.error || "No se pudo importar");
        setBusy(false);
        return;
      }
      setResult(data as ImportResult);
      setBusy(false);
    } catch (e: any) {
      setError(e?.message || "Error inesperado");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="text-sm text-slate-700">
            Importá tickets/ventas para que el sistema descuente stock automáticamente (ideal para minimarket).
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={downloadTemplate}>
              Descargar plantilla 🧾
            </Button>
          </div>
        </CardContent>
      </Card>

      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="text-base font-semibold text-slate-900">1) Subí el archivo</div>
            <div className="text-sm text-slate-600">CSV exportado desde tu POS / caja.</div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Archivo CSV</Label>
              <Input type="file" accept=".csv,text/csv" onChange={(e) => onPick(e.target.files?.[0] || null)} />
              <div className="text-xs text-slate-500">Tip: si tu archivo usa “;” como separador, lo detectamos solo.</div>
            </div>

            {fileName && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="ok">Listo</Badge>
                <span className="text-slate-700">{fileName}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-900">2) Mapeo de columnas</div>
                <div className="mt-1 text-sm text-slate-600">Decinos qué columna corresponde a cada campo.</div>
              </div>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Cambiar archivo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={applySmartGuess}>
                Auto-mapear
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="Modelo IA (opcional, ej: gpt-5)"
                  className="w-[240px]"
                />
                <Button onClick={suggestWithAI} disabled={suggestBusy || headers.length === 0}>
                  {suggestBusy ? "Pensando..." : "Sugerir con IA"}
                </Button>
              </div>
              <div className="ml-auto text-xs text-slate-500">Tip: si tu CSV viene raro, IA suele acertar.</div>
            </div>

            {suggestNotes.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                {suggestNotes.join(" · ")}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <Label>Separador</Label>
                <Select value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
                  <option value=",">, (coma)</option>
                  <option value=";">; (punto y coma)</option>
                  <option value="\t">TAB</option>
                  <option value="|">| (pipe)</option>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <input
                  id="hasHeaderTickets"
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="hasHeaderTickets" className="mb-0">
                  La primera fila es encabezado
                </Label>
              </div>
              <div className="flex items-end justify-end">
                <Button onClick={() => setStep(3)} disabled={!canContinueToPreview}>
                  Previsualizar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Nº Ticket</Label>
                <Select
                  value={mapping.ticketId}
                  onChange={(e) => {
                    setMappingTouched(true);
                    setMapping((m) => ({ ...m, ticketId: e.target.value }));
                  }}
                >
                  <option value="">(sin mapear)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Fecha/Hora</Label>
                <Select
                  value={mapping.issuedAt}
                  onChange={(e) => {
                    setMappingTouched(true);
                    setMapping((m) => ({ ...m, issuedAt: e.target.value }));
                  }}
                >
                  <option value="">(sin mapear)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>SKU / Código</Label>
                <Select
                  value={mapping.sku}
                  onChange={(e) => {
                    setMappingTouched(true);
                    setMapping((m) => ({ ...m, sku: e.target.value }));
                  }}
                >
                  <option value="">(sin mapear)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Nombre producto</Label>
                <Select
                  value={mapping.name}
                  onChange={(e) => {
                    setMappingTouched(true);
                    setMapping((m) => ({ ...m, name: e.target.value }));
                  }}
                >
                  <option value="">(sin mapear)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Cantidad</Label>
                <Select
                  value={mapping.qty}
                  onChange={(e) => {
                    setMappingTouched(true);
                    setMapping((m) => ({ ...m, qty: e.target.value }));
                  }}
                >
                  <option value="">(sin mapear)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Precio unitario</Label>
                <Select
                  value={mapping.unitPrice}
                  onChange={(e) => {
                    setMappingTouched(true);
                    setMapping((m) => ({ ...m, unitPrice: e.target.value }));
                  }}
                >
                  <option value="">(sin mapear)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Total línea</Label>
                <Select
                  value={mapping.lineTotal}
                  onChange={(e) => {
                    setMappingTouched(true);
                    setMapping((m) => ({ ...m, lineTotal: e.target.value }));
                  }}
                >
                  <option value="">(opcional)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Total ticket</Label>
                <Select
                  value={mapping.ticketTotal}
                  onChange={(e) => {
                    setMappingTouched(true);
                    setMapping((m) => ({ ...m, ticketTotal: e.target.value }));
                  }}
                >
                  <option value="">(opcional)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-900">3) Previsualización + Importar</div>
                <div className="mt-1 text-sm text-slate-600">Chequeá que quede bien antes de descontar stock.</div>
              </div>
              <Button variant="ghost" onClick={() => setStep(2)}>
                Volver al mapeo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {mappedPreview.issues.length > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                {mappedPreview.issues.join(" · ")}
              </div>
            )}

            <div className="rounded-lg border border-slate-200 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="p-2 text-left">Ticket</th>
                    <th className="p-2 text-left">Fecha</th>
                    <th className="p-2 text-left">SKU</th>
                    <th className="p-2 text-left">Producto</th>
                    <th className="p-2 text-right">Cant</th>
                    <th className="p-2 text-right">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedPreview.view.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="p-2 whitespace-nowrap">{r.ticketId}</td>
                      <td className="p-2 whitespace-nowrap">{r.issuedAt}</td>
                      <td className="p-2 whitespace-nowrap">{r.sku}</td>
                      <td className="p-2 whitespace-nowrap">{r.name}</td>
                      <td className="p-2 text-right whitespace-nowrap">{r.qty}</td>
                      <td className="p-2 text-right whitespace-nowrap">{r.unitPrice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-slate-600">
                Filas con datos incompletos (sin producto o sin cantidad): <b>{mappedPreview.emptyCore}</b>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button onClick={doImport} disabled={busy || mappedPreview.issues.length > 0}>
                  {busy ? "Importando..." : "Importar y descontar stock"}
                </Button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</div>
            )}

            {result && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="ok">Hecho</Badge>
                  <div className="text-sm text-slate-800">
                    Tickets nuevos: <b>{result.ticketsCreated}</b> · Duplicados: <b>{result.ticketsDuplicated}</b> · Líneas: <b>{result.linesCreated}</b> · Movimientos: <b>{result.movementsCreated}</b>
                  </div>
                </div>

                <div className="text-xs text-slate-600">
                  Sin match de producto: <b>{result.unmatchedLines}</b> · Saltadas: <b>{result.skippedLines}</b> · Errores: <b>{result.errors.length}</b>
                </div>

                {result.unmatchedLines > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => (window.location.href = `/reconcile?batch=${result.batchId}`)}>
                      Resolver sin match 🧩
                    </Button>
                    <div className="text-xs text-slate-600">
                      Al asignar productos, guardamos alias para que la próxima importación matchee sola.
                    </div>
                  </div>
                )}

                {result.topSold?.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-medium text-slate-900">Top vendidos (en este import)</div>
                    <ul className="mt-2 space-y-1 text-sm text-slate-800">
                      {result.topSold.slice(0, 8).map((x) => (
                        <li key={x.productId} className="flex items-center justify-between">
                          <span className="truncate">{x.name}</span>
                          <span className="ml-3 rounded-full bg-white px-2 py-0.5 text-xs text-slate-700">{x.qty} u</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.errors.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="text-sm font-medium text-amber-900">Errores</div>
                    <ul className="mt-2 space-y-1 text-xs text-amber-900">
                      {result.errors.slice(0, 8).map((e, i) => (
                        <li key={i}>
                          Fila {e.row}: {e.message}
                        </li>
                      ))}
                      {result.errors.length > 8 && <li>…y {result.errors.length - 8} más</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
