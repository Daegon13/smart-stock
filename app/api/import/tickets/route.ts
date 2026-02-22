import { NextResponse } from "next/server";
import { z } from "zod";
import { parseCsv } from "@/lib/csv";
import { importTicketsTabular, TicketMappingSchema } from "@/lib/ticketImportPipeline";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getRequestId, logApiEvent } from "@/lib/observability";

const BodySchema = z.object({
  storeId: z.string().min(1).optional(),
  csvText: z.string().min(1),
  delimiter: z.string().min(1).max(1).optional(),
  hasHeader: z.boolean().optional().default(true),
  mapping: TicketMappingSchema,
  fileName: z.string().optional()
});

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const limit = enforceRateLimit({ req, route: "/api/import/tickets", maxRequests: 20, windowMs: 60_000, requestId });
  if (!limit.ok) {
    logApiEvent({ requestId, route: "/api/import/tickets", method: "POST", status: 429, message: "rate limited" });
    return limit.response;
  }

  const maxImportSize = Number(process.env.MAX_IMPORT_SIZE || "2000000");
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "x-request-id": requestId } });
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    logApiEvent({ requestId, route: "/api/import/tickets", method: "POST", status: 400, message: "invalid payload" });
    return json({ error: { message: "Payload inválido", detail: parsed.error.flatten() } }, 400);
  }

  const { csvText, delimiter, hasHeader, mapping, fileName } = parsed.data;

  if (csvText.length > maxImportSize) {
    logApiEvent({ requestId, route: "/api/import/tickets", method: "POST", storeId: parsed.data.storeId, status: 413, message: "payload too large" });
    return json({ error: { message: `Archivo demasiado grande (máx ${maxImportSize} caracteres)` } }, 413);
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

  logApiEvent({ requestId, route: "/api/import/tickets", method: "POST", storeId: parsed.data.storeId, status: 200, message: "import processed" });
  return json(result);
}
