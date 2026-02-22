import { NextResponse } from "next/server";
import { z } from "zod";
import { parseCsv } from "@/lib/csv";
import { importTicketsTabular, TicketMappingSchema } from "@/lib/ticketImportPipeline";
import { enforceRateLimit } from "@/lib/rateLimit";

const BodySchema = z.object({
  storeId: z.string().min(1).optional(),
  csvText: z.string().min(1),
  delimiter: z.string().min(1).max(1).optional(),
  hasHeader: z.boolean().optional().default(true),
  mapping: TicketMappingSchema,
  fileName: z.string().optional()
});

export async function POST(req: Request) {
  const limit = enforceRateLimit({ req, route: "/api/import/tickets", maxRequests: 20, windowMs: 60_000 });
  if (!limit.ok) return limit.response;

  const maxImportSize = Number(process.env.MAX_IMPORT_SIZE || "2000000");
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Payload inválido", detail: parsed.error.flatten() } }, { status: 400 });
  }

  const { csvText, delimiter, hasHeader, mapping, fileName } = parsed.data;

  if (csvText.length > maxImportSize) {
    return NextResponse.json(
      { error: { message: `Archivo demasiado grande (máx ${maxImportSize} caracteres)` } },
      { status: 413 }
    );
  }
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
