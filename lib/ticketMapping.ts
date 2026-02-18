export type TicketMappingKey =
  | "ticketId"
  | "issuedAt"
  | "sku"
  | "name"
  | "qty"
  | "unitPrice"
  | "lineTotal"
  | "ticketTotal";

export type TicketMapping = Record<TicketMappingKey, string | "">;

function norm(s: string) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function headerHint(headersNorm: string[], headersRaw: string[], cands: string[]) {
  const idx = headersNorm.findIndex((x) => cands.some((c) => x === c || x.includes(c)));
  return idx >= 0 ? headersRaw[idx] : "";
}

function looksLikeDate(v: string) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(s) || /\d{4}-\d{2}-\d{2}/.test(s);
}

function looksLikeTicketId(v: string) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  if (s.length > 32) return false;
  return /^[A-Z0-9-_.#\/]{3,32}$/i.test(s) && !/\s/.test(s);
}

function parseNumberLoose(raw: unknown): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const cleaned = s
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function scoreNumeric(values: string[]) {
  const v = values.slice(0, 50);
  let ok = 0;
  let total = 0;
  const nums: number[] = [];
  for (const x of v) {
    const t = String(x ?? "").trim();
    if (!t) continue;
    total++;
    const n = parseNumberLoose(t);
    if (n === null) continue;
    ok++;
    nums.push(n);
  }
  const ratio = total === 0 ? 0 : ok / total;
  const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  return { ratio, avg };
}

export function guessTicketMapping(headers: string[], rows: string[][] = []) {
  const hn = headers.map(norm);
  const find = (cands: string[]) => headerHint(hn, headers, cands);

  const base: TicketMapping = {
    ticketId: find([
      "ticket",
      "ticketid",
      "nro ticket",
      "numero ticket",
      "boleta",
      "comprobante",
      "factura",
      "documento",
      "idventa",
      "id venta",
      "venta"
    ]),
    issuedAt: find(["fecha", "hora", "datetime", "fecha hora", "emision", "emitido", "created", "fechaemision"]),
    sku: find(["sku", "codigo", "cod", "barcode", "codbarras", "codigo de barras", "ean", "plu"]),
    name: find(["nombre", "producto", "descripcion", "articulo", "item"]),
    qty: find(["qty", "cantidad", "cant", "unidades", "uds", "units"]),
    unitPrice: find(["precio", "precio unit", "unit price", "punit", "precio u", "valor", "unitario"]),
    lineTotal: find(["total linea", "subtotal", "importe linea", "importe", "monto", "total"]),
    ticketTotal: find(["total ticket", "totalventa", "total venta", "monto total", "total comprobante"])
  };

  const confidence: Record<TicketMappingKey, number> = {
    ticketId: base.ticketId ? 0.85 : 0,
    issuedAt: base.issuedAt ? 0.75 : 0,
    sku: base.sku ? 0.85 : 0,
    name: base.name ? 0.85 : 0,
    qty: base.qty ? 0.8 : 0,
    unitPrice: base.unitPrice ? 0.7 : 0,
    lineTotal: base.lineTotal ? 0.6 : 0,
    ticketTotal: base.ticketTotal ? 0.55 : 0
  };

  const notes: string[] = [];

  const sample = rows.slice(0, 60);
  if (sample.length) {
    const colValues = (colIdx: number) => sample.map((r) => String(r[colIdx] ?? "").trim()).filter(Boolean);

    if (!base.issuedAt) {
      let best = "";
      let bestScore = 0;
      headers.forEach((h, i) => {
        const vals = colValues(i);
        if (vals.length < 5) return;
        const score = vals.slice(0, 25).filter(looksLikeDate).length / Math.min(vals.length, 25);
        if (score > bestScore && score > 0.6) {
          bestScore = score;
          best = h;
        }
      });
      if (best) {
        base.issuedAt = best;
        confidence.issuedAt = Math.min(0.8, bestScore);
        notes.push(`Detecté una columna probable para Fecha/Hora: “${best}”.`);
      }
    }

    if (!base.ticketId) {
      let best = "";
      let bestScore = 0;
      headers.forEach((h, i) => {
        const vals = colValues(i);
        if (vals.length < 5) return;
        const score = vals.slice(0, 30).filter(looksLikeTicketId).length / Math.min(vals.length, 30);
        if (score > bestScore && score > 0.6) {
          bestScore = score;
          best = h;
        }
      });
      if (best) {
        base.ticketId = best;
        confidence.ticketId = Math.min(0.8, bestScore);
        notes.push(`Detecté una columna probable para Nº Ticket: “${best}”.`);
      }
    }

    if (!base.qty) {
      const numericCols = headers
        .map((h, i) => ({ h, i, ...scoreNumeric(colValues(i)) }))
        .filter((x) => x.ratio >= 0.7);
      const best = numericCols.filter((x) => x.avg <= 50).sort((a, b) => b.ratio - a.ratio)[0];
      if (best) {
        base.qty = best.h;
        confidence.qty = Math.min(0.8, best.ratio);
        notes.push(`Detecté una columna numérica probable para Cantidad: “${best.h}”.`);
      }
    }
  }

  (Object.keys(base) as TicketMappingKey[]).forEach((k) => {
    if (base[k] && !headers.includes(base[k] as string)) {
      base[k] = "";
      confidence[k] = 0;
    }
  });

  if (!base.sku && !base.name) notes.push("No pude detectar SKU/Código ni Nombre del producto. Al menos uno es necesario.");
  if (!base.qty) notes.push("No pude detectar Cantidad. Mapéala manualmente.");

  return { mapping: base, confidence, notes };
}

export const TicketMappingFieldKeys: TicketMappingKey[] = [
  "ticketId",
  "issuedAt",
  "sku",
  "name",
  "qty",
  "unitPrice",
  "lineTotal",
  "ticketTotal"
];
