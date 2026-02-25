import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MovementCreateSchema } from "@/lib/validators";
import { canMutate, withActiveStore } from "@/lib/apiAuth";

export async function GET() {
  return withActiveStore(async ({ storeId }) => {
    const movements = await prisma.inventoryMovement.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { product: { select: { name: true, unit: true } } }
    });

    return NextResponse.json({ movements });
  });
}

export async function POST(req: Request) {
  return withActiveStore(async ({ storeId, role }) => {
    if (!canMutate(role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = MovementCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { productId, type, qty, note } = parsed.data;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.storeId !== storeId) {
      return NextResponse.json({ error: "Producto inválido para este local" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const current = product.currentStock;
      const nextStock = type === "IN" ? current + qty : type === "OUT" ? Math.max(0, current - qty) : Math.max(0, qty);
      const movement = await tx.inventoryMovement.create({
        data: { storeId, productId, type, qty, note: note || null },
        include: { product: { select: { name: true, unit: true } } }
      });
      const updated = await tx.product.update({ where: { id: productId }, data: { currentStock: nextStock } });
      return { movement, product: updated };
    });

    return NextResponse.json(result, { status: 201 });
  });
}
