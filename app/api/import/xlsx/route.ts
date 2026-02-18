import { NextResponse } from "next/server";
import { z } from "zod";
import * as XLSX from "xlsx";
import { importTabular, MappingSchema } from "@/lib/importPipeline";

const BodySchema = z.object({
  action: z.enum(["parse", "import"]),
  storeId: z.string().min(1).optional(),
  fileBase64: z.string().min(1),
  fileName: z.string().optional(),
  sheetName: z.string().optional(),
  hasHeader: z.boolean().optional().default(true),
  mapping: MappingSchema.optional()
});

function toStringsTable(aoa: any[][]): string[][] {
  return aoa.map((row) => row.map((c) => (c === null || c === undefined ? "" : String(c))));
}

function parseWorkbook(fileBase64: string) {
  const buf = Buffer.from(fileBase64, "base64");
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetNames = wb.SheetNames || [];
  return { wb, sheetNames };
}

function extractTable(wb: XLSX.WorkBook, sheetName: string, hasHeader: boolean) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return { headers: [] as string[], rows: [] as string[][] };

  const aoaRaw = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" }) as any[][];
  const aoa = toStringsTable(aoaRaw)
    .map((r) => r.map((c) => c.trim?.() ? c.trim() : c))
    .filter((r) => r.some((c) => String(c ?? "").trim() !== ""));

  if (aoa.length === 0) return { headers: [] as string[], rows: [] as string[][] };

  const maxCols = Math.max(...aoa.map((r) => r.length));
  const pad = (r: string[]) => {
    const rr = r.slice();
    while (rr.length < maxCols) rr.push("");
    return rr;
  };
  const padded = aoa.map(pad);

  if (hasHeader) {
    const headerRow = padded[0].map((h, i) => (String(h ?? "").trim() || `Col ${i + 1}`));
    const rows = padded.slice(1);
    return { headers: headerRow, rows };
  }

  const headers = Array.from({ length: maxCols }, (_, i) => `Col ${i + 1}`);
  return { headers, rows: padded };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Payload inválido", detail: parsed.error.flatten() } }, { status: 400 });
  }

  const { action, fileBase64, hasHeader } = parsed.data;

  let wb: XLSX.WorkBook;
  let sheetNames: string[];
  try {
    const p = parseWorkbook(fileBase64);
    wb = p.wb;
    sheetNames = p.sheetNames;
  } catch (e: any) {
    return NextResponse.json({ error: { message: "No se pudo leer el Excel", detail: e?.message } }, { status: 400 });
  }

  const sheetName = parsed.data.sheetName || sheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ error: { message: "El archivo no tiene hojas (sheets)" } }, { status: 400 });
  }

  const { headers, rows } = extractTable(wb, sheetName, hasHeader);
  const cappedRows = rows.slice(0, 2000);

  if (action === "parse") {
    return NextResponse.json({
      sheetNames,
      sheetName,
      headers,
      rows: cappedRows,
      rowCount: rows.length,
      cappedAt: 2000
    });
  }

  const mapping = parsed.data.mapping;
  if (!mapping) {
    return NextResponse.json({ error: { message: "Falta mapping para importar" } }, { status: 400 });
  }

  const result = await importTabular({
    storeId: parsed.data.storeId,
    headers,
    rows: cappedRows,
    hasHeader,
    mapping,
    note: "Import XLSX"
  });

  return NextResponse.json({ ...result, sheetName, rowCount: rows.length, cappedAt: 2000 });
}
