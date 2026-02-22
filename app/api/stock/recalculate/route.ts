import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestId, logApiEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const body = await req.json().catch(() => null);
  const storeId = String(body?.storeId || "");

  if (!storeId) {
    logApiEvent({ requestId, route: "/api/stock/recalculate", method: "POST", status: 400, message: "missing storeId" });
    return NextResponse.json({ ok: false, error: "storeId requerido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
  if (!store) {
    logApiEvent({ requestId, route: "/api/stock/recalculate", method: "POST", storeId, status: 404, message: "store not found" });
    return NextResponse.json({ ok: false, error: "storeId inválido" }, { status: 404 });
  }

  const movements = await prisma.inventoryMovement.findMany({
    where: { storeId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { productId: true, type: true, qty: true }
  });

  const nextStockByProduct = new Map<string, number>();
  for (const m of movements) {
    const current = nextStockByProduct.get(m.productId) || 0;
    if (m.type === "IN") nextStockByProduct.set(m.productId, current + m.qty);
    else if (m.type === "OUT") nextStockByProduct.set(m.productId, Math.max(0, current - m.qty));
    else if (m.type === "ADJUST") nextStockByProduct.set(m.productId, Math.max(0, m.qty));
  }

  const updates = Array.from(nextStockByProduct.entries());

  await prisma.$transaction(async (tx) => {
    for (const [productId, currentStock] of updates) {
      await tx.product.updateMany({ where: { id: productId, storeId }, data: { currentStock } });
    }
  });

  logApiEvent({
    requestId,
    route: "/api/stock/recalculate",
    method: "POST",
    storeId,
    status: 200,
    message: `recalculated stock (movements=${movements.length}, products=${updates.length})`
  });

  return NextResponse.json({
    ok: true,
    stats: {
      movements: movements.length,
      products: updates.length
    }
  });
}
