import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MovementCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") || "";
  if (!storeId) return NextResponse.json({ error: "storeId requerido" }, { status: 400 });

  const movements = await prisma.inventoryMovement.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { product: { select: { name: true, unit: true } } }
  });

  return NextResponse.json({ movements });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = MovementCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { storeId, productId, type, qty, note } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.storeId !== storeId) {
    return NextResponse.json({ error: "Producto inválido para este local" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const current = product.currentStock;
    let nextStock = current;

    if (type === "IN") nextStock = current + qty;
    if (type === "OUT") nextStock = Math.max(0, current - qty);
    if (type === "ADJUST") nextStock = Math.max(0, qty);

    const movement = await tx.inventoryMovement.create({
      data: {
        storeId,
        productId,
        type,
        qty,
        note: note || null
      },
      include: { product: { select: { name: true, unit: true } } }
    });

    const updated = await tx.product.update({
      where: { id: productId },
      data: { currentStock: nextStock }
    });

    return { movement, product: updated };
  });

  return NextResponse.json(result, { status: 201 });
}
