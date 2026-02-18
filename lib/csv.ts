export type ParsedCsv = {
  delimiter: string;
  headers: string[];
  rows: string[][];
};

function normalizeNewlines(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function detectDelimiter(text: string): string {
  const sample = normalizeNewlines(text).split("\n").slice(0, 5).join("\n");
  const candidates = [",", ";", "\t", "|"];
  const scores = candidates.map((d) => {
    const lines = sample.split("\n").filter(Boolean).slice(0, 5);
    const counts = lines.map((l) => l.split(d).length);
    // prefer delimiters that produce a consistent column count > 1
    const mean = counts.reduce((a, b) => a + b, 0) / (counts.length || 1);
    const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (counts.length || 1);
    const consistency = variance === 0 ? 1 : 1 / variance;
    return mean > 1 ? mean * consistency : 0;
  });
  const bestIdx = scores.indexOf(Math.max(...scores));
  return candidates[bestIdx] || ",";
}

// Small CSV parser with quote support ("...") and escaped quotes ("")
export function parseCsv(text: string, opts?: { delimiter?: string; hasHeader?: boolean; maxRows?: number }): ParsedCsv {
  const delimiter = opts?.delimiter ?? detectDelimiter(text);
  const hasHeader = opts?.hasHeader ?? true;
  const maxRows = opts?.maxRows ?? 2000;

  const src = normalizeNewlines(text);
  const rows: string[][] = [];

  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    // Avoid pushing trailing empty line
    if (row.length === 1 && row[0] === "" && rows.length === 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (ch === '"') {
      const next = src[i + 1];
      if (inQuotes && next === '"') {
        field += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      pushField();
      continue;
    }

    if (!inQuotes && ch === "\n") {
      pushField();
      pushRow();
      if (rows.length >= maxRows + 1) break; // + header
      continue;
    }

    field += ch;
  }

  // flush last
  pushField();
  if (row.length > 1 || row[0] !== "") pushRow();

  const clean = (v: string) => v.trim().replace(/^\uFEFF/, "");
  const cleanedRows = rows
    .map((r) => r.map(clean))
    .filter((r) => r.some((c) => c !== ""));

  let headers: string[] = [];
  let dataRows: string[][] = cleanedRows;

  if (hasHeader && cleanedRows.length > 0) {
    headers = cleanedRows[0].map((h, idx) => (h ? h : `Col ${idx + 1}`));
    dataRows = cleanedRows.slice(1);
  } else {
    const width = Math.max(0, ...cleanedRows.map((r) => r.length));
    headers = Array.from({ length: width }, (_, i) => `Col ${i + 1}`);
  }

  // pad rows to header width
  dataRows = dataRows.map((r) => {
    const out = [...r];
    while (out.length < headers.length) out.push("");
    return out;
  });

  return { delimiter, headers, rows: dataRows };
}

export function toCsv(rows: string[][], delimiter = ","): string {
  const esc = (v: string) => {
    const needs = v.includes('"') || v.includes("\n") || v.includes(delimiter);
    const doubled = v.replace(/"/g, '""');
    return needs ? `"${doubled}"` : doubled;
  };
  return rows.map((r) => r.map((c) => esc(String(c ?? ""))).join(delimiter)).join("\n");
}
