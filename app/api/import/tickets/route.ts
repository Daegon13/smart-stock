import { NextResponse } from "next/server";
import { z } from "zod";
import { parseCsv } from "@/lib/csv";
import { importTicketsTabular, TicketMappingSchema } from "@/lib/ticketImportPipeline";

const BodySchema = z.object({
  storeId: z.string().min(1).optional(),
  csvText: z.string().min(1),
  delimiter: z.string().min(1).max(1).optional(),
  hasHeader: z.boolean().optional().default(true),
  mapping: TicketMappingSchema,
  fileName: z.string().optional()
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Payload inválido", detail: parsed.error.flatten() } }, { status: 400 });
  }

  const { csvText, delimiter, hasHeader, mapping, fileName } = parsed.data;
  const { headers, rows } = parseCsv(csvText, { delimiter, hasHeader, maxRows: 20000 });

  const result = await importTicketsTabular({
    storeId: parsed.data.storeId,
    headers,
    rows,
    hasHeader,
    mapping,
    fileName,
    delimiter
  });

  return NextResponse.json(result);
}
