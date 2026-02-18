import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PurchaseOrderCreateSchema } from "@/lib/validators";
import { requirePermission } from "@/lib/rbac";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") || "";
  if (!storeId) return NextResponse.json({ error: "storeId requerido" }, { status: 400 });

  const orders = await prisma.purchaseOrder.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
      items: { select: { qtyOrdered: true, qtyReceived: true } }
    }
  });

  const mapped = orders.map((o) => {
    const totalOrdered = o.items.reduce((a, i) => a + i.qtyOrdered, 0);
    const totalReceived = o.items.reduce((a, i) => a + i.qtyReceived, 0);
    return {
      id: o.id,
      title: o.title,
      status: o.status,
      notes: o.notes,
      supplier: o.supplier,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      receivedAt: o.receivedAt,
      itemCount: o.items.length,
      totalOrdered,
      totalReceived
    };
  });

  return NextResponse.json({ orders: mapped });
}

export async function POST(req: Request) {
  const perm = requirePermission(req, "orders:write");
  if (!perm.ok) return perm.response;

  const body = await req.json().catch(() => null);
  const parsed = PurchaseOrderCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { storeId, supplierId, title, notes, items } = parsed.data;

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return NextResponse.json({ error: "Store inválida" }, { status: 400 });

  if (supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) return NextResponse.json({ error: "Proveedor inválido" }, { status: 400 });
  }

  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, storeId: true }
  });

  if (products.length !== productIds.length || products.some((p) => p.storeId !== storeId)) {
    return NextResponse.json({ error: "Hay productos inválidos para este local" }, { status: 400 });
  }

  const order = await prisma.purchaseOrder.create({
    data: {
      storeId,
      supplierId: supplierId || null,
      title: title?.trim() ? title.trim() : "Orden de compra",
      notes: notes?.trim() ? notes.trim() : null,
      status: "DRAFT",
      items: {
        create: items.map((i) => ({
          productId: i.productId,
          qtyOrdered: i.qtyOrdered,
          unitCost: typeof i.unitCost === "number" ? i.unitCost : null,
          note: i.note?.trim() ? i.note.trim() : null
        }))
      }
    },
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
      items: { include: { product: { select: { name: true, sku: true, unit: true } } } }
    }
  });

  return NextResponse.json({ order }, { status: 201 });
}
