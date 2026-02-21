import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const batchId = params.id;
  const body = await req.json().catch(() => null);
  const storeId = String(body?.storeId || "");

  if (!storeId) {
    return NextResponse.json({ ok: false, error: "storeId requerido" }, { status: 400 });
  }

  const batch = await prisma.ticketImportBatch.findUnique({ where: { id: batchId } });
  if (!batch || batch.storeId !== storeId) {
    return NextResponse.json({ ok: false, error: "Lote no encontrado" }, { status: 404 });
  }

  // Movimientos creados por este lote
  const movements = await prisma.inventoryMovement.findMany({
    where: { storeId, importBatchId: batchId },
    select: { id: true, productId: true, type: true, qty: true, createdAt: true }
  });

  if (movements.length === 0) {
    return NextResponse.json({ ok: false, error: "Este lote no tiene movimientos para deshacer." }, { status: 409 });
  }

  // Solo soportamos revertir lotes que generaron OUT/IN (tickets generan OUT)
  const bad = movements.find((m) => !["OUT", "IN"].includes(m.type));
  if (bad) {
    return NextResponse.json(
      { ok: false, error: `No se puede deshacer: movimiento tipo ${bad.type}.` },
      { status: 409 }
    );
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
    return NextResponse.json(
      {
        ok: false,
        error:
          "No se puede deshacer porque existen movimientos posteriores a este import. (Para hacerlo seguro, habría que recalcular stock desde cero o deshacer en orden inverso)."
      },
      { status: 409 }
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

  return NextResponse.json({
    ok: true,
    undone: {
      movements: movements.length,
      tickets: tickets.length,
      products: deltaByProduct.size
    }
  });
}
