import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PurchaseOrderReceiveSchema } from "@/lib/validators";
import { requirePermission } from "@/lib/rbac";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const perm = requirePermission(req, "orders:receive");
  if (!perm.ok) return perm.response;

  const orderId = ctx.params.id;
  const body = await req.json().catch(() => null);
  const parsed = PurchaseOrderReceiveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, storeId: true, currentStock: true } }
        }
      }
    }
  });

  if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  const byId = new Map(order.items.map((i) => [i.id, i] as const));

  // Validación previa: cantidades y pertenencia.
  for (const r of parsed.data.items) {
    const it = byId.get(r.itemId);
    if (!it) return NextResponse.json({ error: `Item inválido: ${r.itemId}` }, { status: 400 });
    const remaining = Math.max(0, it.qtyOrdered - it.qtyReceived);
    if (r.qty > remaining) {
      return NextResponse.json(
        { error: `Cantidad inválida para ${it.product.name}. Queda por recibir: ${remaining}` },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    // aplicar recepciones
    for (const r of parsed.data.items) {
      const it = byId.get(r.itemId)!;

      await tx.purchaseOrderItem.update({
        where: { id: it.id },
        data: {
          qtyReceived: { increment: r.qty }
        }
      });

      // movimiento IN
      await tx.inventoryMovement.create({
        data: {
          storeId: order.storeId,
          productId: it.productId,
          type: "IN",
          qty: r.qty,
          note: `Recepción OC ${order.id}`
        }
      });

      // stock producto
      await tx.product.update({
        where: { id: it.productId },
        data: { currentStock: { increment: r.qty } }
      });
    }

    const fresh = await tx.purchaseOrder.findUnique({
      where: { id: order.id },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true, currentStock: true } }
          }
        }
      }
    });

    if (!fresh) throw new Error("Orden no encontrada (post)");

    const allReceived = fresh.items.every((i) => i.qtyReceived >= i.qtyOrdered);
    const status = allReceived ? "RECEIVED" : "PARTIAL";

    const final = await tx.purchaseOrder.update({
      where: { id: fresh.id },
      data: {
        status,
        receivedAt: allReceived ? new Date() : fresh.receivedAt
      },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true, currentStock: true } }
          }
        }
      }
    });

    return final;
  });

  return NextResponse.json({ order: updated }, { status: 200 });
}
