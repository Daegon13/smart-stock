import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestId, logApiEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const json = (body: unknown, status = 200) =>
    NextResponse.json(body, { status, headers: { "x-request-id": requestId, "cache-control": "no-store" } });

  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId") || "";
  const takeRaw = Number(url.searchParams.get("take") || "25");
  const take = Number.isFinite(takeRaw) ? Math.min(100, Math.max(1, Math.floor(takeRaw))) : 25;

  if (!storeId) {
    logApiEvent({
      requestId,
      route: "/api/import/batches",
      method: "GET",
      status: 400,
      message: "missing storeId"
    });
    return json({ ok: false, error: "storeId requerido" }, 400);
  }

  const batches = await prisma.ticketImportBatch.findMany({
    where: { storeId },
    orderBy: { importedAt: "desc" },
    take,
    select: {
      id: true,
      source: true,
      fileName: true,
      ticketsCount: true,
      linesCount: true,
      movementsCount: true,
      skippedCount: true,
      duplicatesCount: true,
      errorCount: true,
      unmatchedLines: true,
      importedAt: true
    }
  });

  logApiEvent({
    requestId,
    route: "/api/import/batches",
    method: "GET",
    storeId,
    status: 200,
    message: `listed batches: ${batches.length} (take=${take})`
  });

  return json({ ok: true, batches });
}
