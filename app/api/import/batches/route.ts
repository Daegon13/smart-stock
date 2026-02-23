import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestId, logApiEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "x-request-id": requestId } });
  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId") || "";
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
    take: 25
  });

  logApiEvent({
    requestId,
    route: "/api/import/batches",
    method: "GET",
    storeId,
    status: 200,
    message: `listed batches: ${batches.length}`
  });

  return json({ ok: true, batches });
}
