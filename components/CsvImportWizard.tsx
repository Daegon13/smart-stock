"use client";

import * as React from "react";
import { Button, Card, CardContent, CardHeader, Input, Label, Select, Badge } from "@/components/ui";
import { detectDelimiter, parseCsv } from "@/lib/csv";
import { guessMappingSmart, type Mapping, type MappingKey } from "@/lib/importMapping";

type ImportResult = {
  created: number;
  updated: number;
  movementsCreated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

function clampInt(v: number) {
  if (!Number.isFinite(v)) return null;
  const n = Math.round(v);
  if (n < 0) return 0;
  return n;
}

function parseNumberLoose(raw: string): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  // handle 1.234,56 and 1,234.56
  const cleaned = s
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function CsvImportWizard({ storeId }: { storeId: string }) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = React.useState<string>("");
  const [csvText, setCsvText] = React.useState<string>("");
  const [hasHeader, setHasHeader] = React.useState(true);
  const [delimiter, setDelimiter] = React.useState<string>(",");

  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<string[][]>([]);

  const [mapping, setMapping] = React.useState<Mapping>({
    sku: "",
    name: "",
    stock: "",
    cost: "",
    price: "",
    supplier: "",
    category: ""
  });

  const [mappingTouched, setMappingTouched] = React.useState(false);
  const [suggestBusy, setSuggestBusy] = React.useState(false);
  const [suggestNotes, setSuggestNotes] = React.useState<string[]>([]);
  const [suggestConfidence, setSuggestConfidence] = React.useState<Record<MappingKey, number>>({
    sku: 0,
    name: 0,
    stock: 0,
    cost: 0,
    price: 0,
    supplier: 0,
    category: 0
  });
  const [aiModel, setAiModel] = React.useState<string>("");

  const [previewLimit] = React.useState(15);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<string>("");

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

    const parsed = parseCsv(text, { delimiter: d, hasHeader: true, maxRows: 2000 });
    setHasHeader(true);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    const guess = guessMappingSmart(parsed.headers, parsed.rows);
    setMapping(guess.mapping);
    setSuggestConfidence(guess.confidence);
    setSuggestNotes(["Sugerencia automática aplicada.", ...guess.notes]);
    setMappingTouched(false);
    setStep(2);
  };

  const reparse = React.useCallback(() => {
    if (!csvText) return;
    const parsed = parseCsv(csvText, { delimiter, hasHeader, maxRows: 2000 });
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    // if mapping points to headers that disappeared, reset those keys
    setMapping((m) => {
      const next = { ...m };
      (Object.keys(next) as MappingKey[]).forEach((k) => {
        if (next[k] && !parsed.headers.includes(next[k] as string)) next[k] = "";
      });
      return next;
    });

    // If user hasn't touched the mapping, refresh the smart guess (useful when toggling header/separator)
    if (!mappingTouched) {
      const guess = guessMappingSmart(parsed.headers, parsed.rows);
      setMapping(guess.mapping);
      setSuggestConfidence(guess.confidence);
      setSuggestNotes(["Sugerencia automática actualizada.", ...guess.notes]);
    }
  }, [csvText, delimiter, hasHeader, mappingTouched]);

  React.useEffect(() => {
    reparse();
  }, [reparse]);

  const applySmartGuess = () => {
    const guess = guessMappingSmart(headers, rows);
    setMapping(guess.mapping);
    setSuggestConfidence(guess.confidence);
    setSuggestNotes(["Sugerencia automática aplicada.", ...guess.notes]);
    setMappingTouched(false);
  };

  const suggestWithAI = async () => {
    setSuggestBusy(true);
    setSuggestNotes([]);
    try {
      const res = await fetch("/api/import/suggest-mapping", {
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
      if (data?.mapping) setMapping(data.mapping as Mapping);
      if (data?.confidence) setSuggestConfidence(data.confidence as Record<MappingKey, number>);
      if (Array.isArray(data?.notes)) setSuggestNotes(data.notes.map((x: any) => String(x)));
      setMappingTouched(false);
      setSuggestBusy(false);
    } catch (e: any) {
      setSuggestNotes([e?.message || "Error inesperado"]);
      setSuggestBusy(false);
    }
  };

  const ConfidencePill = ({ v }: { v: number }) => {
    const vv = Number.isFinite(v) ? v : 0;
    const variant = vv >= 0.8 ? "ok" : vv >= 0.55 ? "soon" : vv >= 0.35 ? "neutral" : "low";
    return <Badge variant={variant as any}>{Math.round(vv * 100)}%</Badge>;
  };

  const mappedPreview = React.useMemo(() => {
    const idxOf = (h: string) => headers.findIndex((x) => x === h);
    const get = (r: string[], key: MappingKey) => {
      const col = mapping[key];
      if (!col) return "";
      const idx = idxOf(col);
      return idx >= 0 ? String(r[idx] ?? "") : "";
    };

    const take = rows.slice(0, previewLimit);
    const view = take.map((r) => {
      const name = get(r, "name");
      const sku = get(r, "sku");
      const stock = get(r, "stock");
      const supplier = get(r, "supplier");
      const cost = get(r, "cost");
      const price = get(r, "price");
      const category = get(r, "category");
      return { name, sku, stock, supplier, cost, price, category };
    });

    const issues: string[] = [];
    if (!mapping.name && !mapping.sku) issues.push("Mapeá al menos Nombre o SKU");

    // quick validation counts
    let emptyCore = 0;
    for (const r of rows) {
      const name = get(r, "name").trim();
      const sku = get(r, "sku").trim();
      if (!name && !sku) emptyCore++;
    }

    return { view, issues, emptyCore };
  }, [headers, rows, mapping, previewLimit]);

  const canContinueToPreview = !!csvText && headers.length > 0;

  const doImport = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/import/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, csvText, delimiter, hasHeader, mapping })
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

  const StepPill = ({ n, label }: { n: number; label: string }) => {
    const active = step === n;
    const done = step > n;
    return (
      <div className="flex items-center gap-2">
        <span
          className={
            "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold " +
            (done
              ? "bg-emerald-600 text-white"
              : active
              ? "bg-slate-900 text-white"
              : "bg-slate-200 text-slate-700")
          }
        >
          {done ? "✓" : n}
        </span>
        <span className={"text-sm " + (active ? "text-slate-900 font-medium" : "text-slate-600")}>{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <StepPill n={1} label="Archivo" />
        <span className="text-slate-300">—</span>
        <StepPill n={2} label="Mapeo" />
        <span className="text-slate-300">—</span>
        <StepPill n={3} label="Previsualizar & Importar" />
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-slate-900">Importar desde CSV</div>
                <div className="mt-1 text-sm text-slate-600">
                  Subí tu archivo y en 1 minuto te dejamos todo listo: productos + stock inicial.
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Archivo CSV</Label>
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => onPick(e.target.files?.[0] || null)}
              />
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
                <div className="text-base font-semibold text-slate-900">Mapeo de columnas</div>
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
              <div className="ml-auto text-xs text-slate-500">
                Tip: IA sirve mucho cuando tenés columnas tipo “Precio compra / Precio venta”.
              </div>
            </div>

            {(suggestNotes.length > 0 || suggestConfidence.name > 0 || suggestConfidence.sku > 0) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Confianza:</span>
                  <span className="inline-flex items-center gap-2">Nombre <ConfidencePill v={suggestConfidence.name} /></span>
                  <span className="inline-flex items-center gap-2">SKU <ConfidencePill v={suggestConfidence.sku} /></span>
                  <span className="inline-flex items-center gap-2">Stock <ConfidencePill v={suggestConfidence.stock} /></span>
                  <span className="inline-flex items-center gap-2">Costo <ConfidencePill v={suggestConfidence.cost} /></span>
                  <span className="inline-flex items-center gap-2">Precio <ConfidencePill v={suggestConfidence.price} /></span>
                </div>
                {suggestNotes.length > 0 && (
                  <div className="mt-2 text-xs text-slate-600">{suggestNotes.join(" · ")}</div>
                )}
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
                  id="hasHeader"
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="hasHeader" className="mb-0">
                  La primera fila es encabezado
                </Label>
              </div>
              <div className="text-xs text-slate-500 md:text-right">
                Detectados: <span className="font-medium text-slate-700">{headers.length}</span> columnas
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {([
                ["name", "Nombre *"],
                ["sku", "SKU / Código"],
                ["stock", "Stock"],
                ["cost", "Costo"],
                ["price", "Precio"],
                ["supplier", "Proveedor"],
                ["category", "Categoría"]
              ] as Array<[MappingKey, string]>).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label>{label}</Label>
                  <Select
                    value={mapping[key]}
                    onChange={(e) => {
                      setMappingTouched(true);
                      setMapping((m) => ({ ...m, [key]: e.target.value }));
                    }}
                  >
                    <option value="">(No usar)</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setStep(3)}
                disabled={!canContinueToPreview || mappedPreview.issues.length > 0}
              >
                Continuar
              </Button>
              {mappedPreview.issues.length > 0 && (
                <span className="text-sm text-red-700">{mappedPreview.issues.join(" · ")}</span>
              )}
              <div className="ml-auto text-xs text-slate-500">Sugerencia: mapeá al menos Nombre o SKU.</div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-900">Previsualización</div>
                <div className="mt-1 text-sm text-slate-600">
                  Revisá las primeras filas antes de importar.
                </div>
              </div>
              <Button variant="ghost" onClick={() => setStep(2)}>
                Volver a mapeo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={mappedPreview.emptyCore > 0 ? "soon" : "ok"}>
                Filas sin Nombre/SKU: {mappedPreview.emptyCore}
              </Badge>
              <Badge variant="neutral">Se importarán hasta 2000 filas por carga</Badge>
              <div className="ml-auto text-xs text-slate-500">Archivo: {fileName || "(sin nombre)"}</div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-right">Stock</th>
                    <th className="px-3 py-2 text-left">Proveedor</th>
                    <th className="px-3 py-2 text-right">Costo</th>
                    <th className="px-3 py-2 text-right">Precio</th>
                    <th className="px-3 py-2 text-left">Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedPreview.view.map((r, idx) => {
                    const stockN = mapping.stock ? clampInt(parseNumberLoose(r.stock) ?? NaN) : null;
                    const bad = (!r.name?.trim() && !r.sku?.trim());
                    return (
                      <tr key={idx} className={"border-t border-slate-200 " + (bad ? "bg-red-50" : "bg-white")}> 
                        <td className="px-3 py-2">{r.name || <span className="text-slate-400">—</span>}</td>
                        <td className="px-3 py-2">{r.sku || <span className="text-slate-400">—</span>}</td>
                        <td className="px-3 py-2 text-right">{stockN ?? <span className="text-slate-400">—</span>}</td>
                        <td className="px-3 py-2">{r.supplier || <span className="text-slate-400">—</span>}</td>
                        <td className="px-3 py-2 text-right">{r.cost || <span className="text-slate-400">—</span>}</td>
                        <td className="px-3 py-2 text-right">{r.price || <span className="text-slate-400">—</span>}</td>
                        <td className="px-3 py-2">{r.category || <span className="text-slate-400">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

            {result && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                <div className="font-medium">Importación completada</div>
                <div className="mt-1 grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div>Creados: <span className="font-semibold">{result.created}</span></div>
                  <div>Actualizados: <span className="font-semibold">{result.updated}</span></div>
                  <div>Movimientos: <span className="font-semibold">{result.movementsCreated}</span></div>
                  <div>Saltados: <span className="font-semibold">{result.skipped}</span></div>
                </div>
                {result.errors?.length > 0 && (
                  <div className="mt-2 text-xs text-slate-600">Errores (primeros 10): {result.errors.slice(0, 10).map((e) => `#${e.row} ${e.message}`).join(" · ")}</div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={doImport} disabled={busy}>
                {busy ? "Importando..." : "Importar"}
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)} disabled={busy}>
                Ajustar mapeo
              </Button>
              <div className="ml-auto text-xs text-slate-500">Consejo: si el stock está mal, mapeá “Stock” y reimportá.</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
