import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestId, logApiEvent } from "@/lib/observability";
import { isUndoImportEnabled } from "@/lib/importGate";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  const batchId = params.id;
  const json = (body: unknown, status = 200) =>
    NextResponse.json(body, { status, headers: { "x-request-id": requestId, "cache-control": "no-store" } });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    logApiEvent({
      requestId,
      route: `/api/import/batches/${batchId}/undo`,
      method: "POST",
      status: 400,
      message: "invalid payload"
    });
    return json({ ok: false, error: "Payload inválido" }, 400);
  }

  if (!isUndoImportEnabled()) {
    logApiEvent({
      requestId,
      route: `/api/import/batches/${batchId}/undo`,
      method: "POST",
      status: 403,
      message: "undo import disabled by config"
    });
    return json({ ok: false, error: "Undo import deshabilitado por configuración" }, 403);
  }

  const storeId = String((body as { storeId?: unknown }).storeId || "");

  if (!storeId) {
    logApiEvent({
      requestId,
      route: `/api/import/batches/${batchId}/undo`,
      method: "POST",
      status: 400,
      message: "missing storeId"
    });
    return json({ ok: false, error: "storeId requerido" }, 400);
  }

  const batch = await prisma.ticketImportBatch.findUnique({ where: { id: batchId } });
  if (!batch || batch.storeId !== storeId) {
    logApiEvent({
      requestId,
      route: `/api/import/batches/${batchId}/undo`,
      method: "POST",
      storeId,
      status: 404,
      message: "batch not found"
    });
    return json({ ok: false, error: "Lote no encontrado" }, 404);
  }

  // Movimientos creados por este lote
  const movements = await prisma.inventoryMovement.findMany({
    where: { storeId, importBatchId: batchId },
    select: { id: true, productId: true, type: true, qty: true, createdAt: true }
  });

  if (movements.length === 0) {
    logApiEvent({
      requestId,
      route: `/api/import/batches/${batchId}/undo`,
      method: "POST",
      storeId,
      status: 409,
      message: "batch without movements"
    });
    return json({ ok: false, error: "Este lote no tiene movimientos para deshacer." }, 409);
  }

  // Solo soportamos revertir lotes que generaron OUT/IN (tickets generan OUT)
  const bad = movements.find((m) => !["OUT", "IN"].includes(m.type));
  if (bad) {
    logApiEvent({
      requestId,
      route: `/api/import/batches/${batchId}/undo`,
      method: "POST",
      storeId,
      status: 409,
      message: `invalid movement type: ${bad.type}`
    });
    return json({ ok: false, error: `No se puede deshacer: movimiento tipo ${bad.type}.` }, 409);
  }

  const productIds = Array.from(new Set(movements.map((m) => m.productId)));

  // Safety: si hubo movimientos posteriores (para esos productos) que NO sean de este lote, bloqueamos.
  const later = await prisma.inventoryMovement.findFirst({
    where: {
      storeId,
      productId: { in: productIds },
      createdAt: { gt: batch.importedAt },
      NOT: { importBatchId: batchId }
    },
    select: { id: true, productId: true, createdAt: true }
  });

  if (later) {
    logApiEvent({
      requestId,
      route: `/api/import/batches/${batchId}/undo`,
      method: "POST",
      storeId,
      status: 409,
      message: "blocked by newer movements"
    });
    return json(
      {
        ok: false,
        error:
          "No se puede deshacer porque existen movimientos posteriores a este import. (Para hacerlo seguro, habría que recalcular stock desde cero o deshacer en orden inverso)."
      },
      409
    );
  }

  // Calculamos el delta por producto (revertir OUT => sumar qty; revertir IN => restar qty)
  const deltaByProduct = new Map<string, number>();
  for (const m of movements) {
    const delta = m.type === "OUT" ? m.qty : -m.qty;
    deltaByProduct.set(m.productId, (deltaByProduct.get(m.productId) || 0) + delta);
  }

  // Tickets de este lote
  const tickets = await prisma.ticket.findMany({
    where: { storeId, batchId },
    select: { id: true }
  });

  await prisma.$transaction(async (tx) => {
    // 1) revertimos stock
    for (const [productId, delta] of deltaByProduct.entries()) {
      const p = await tx.product.findUnique({ where: { id: productId }, select: { currentStock: true } });
      const cur = p?.currentStock ?? 0;
      const next = Math.max(0, cur + delta);
      await tx.product.update({ where: { id: productId }, data: { currentStock: next } });
    }

    // 2) borrar movimientos
    await tx.inventoryMovement.deleteMany({ where: { storeId, importBatchId: batchId } });

    // 3) borrar líneas y tickets
    const ticketIds = tickets.map((t) => t.id);
    if (ticketIds.length) {
      await tx.ticketLine.deleteMany({ where: { ticketId: { in: ticketIds } } });
      await tx.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    }

    // 4) borrar lote
    await tx.ticketImportBatch.delete({ where: { id: batchId } });
  });

  logApiEvent({
    requestId,
    route: `/api/import/batches/${batchId}/undo`,
    method: "POST",
    storeId,
    status: 200,
    message: `undo ok (movements=${movements.length}, tickets=${tickets.length}, products=${deltaByProduct.size})`
  });

  return json({
    ok: true,
    undone: {
      movements: movements.length,
      tickets: tickets.length,
      products: deltaByProduct.size
    }
  });
}
