import { NextResponse } from "next/server";
import { z } from "zod";
import { parseCsv } from "@/lib/csv";
import { importTabular, MappingSchema } from "@/lib/importPipeline";

const BodySchema = z.object({
  storeId: z.string().min(1).optional(),
  csvText: z.string().min(1),
  delimiter: z.string().min(1).max(1).optional(),
  hasHeader: z.boolean().optional().default(true),
  mapping: MappingSchema
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Payload inválido", detail: parsed.error.flatten() } }, { status: 400 });
  }

  const { csvText, delimiter, hasHeader, mapping } = parsed.data;

  // Parse and cap at 2000 rows for MVP
  const { headers, rows } = parseCsv(csvText, { delimiter, hasHeader, maxRows: 2000 });

  const result = await importTabular({
    storeId: parsed.data.storeId,
    headers,
    rows,
    hasHeader,
    mapping,
    note: "Import CSV"
  });

  return NextResponse.json(result);
}
