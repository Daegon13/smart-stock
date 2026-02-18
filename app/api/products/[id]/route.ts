import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ProductUpdateSchema } from "@/lib/validators";
import { requirePermission } from "@/lib/rbac";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const perm = requirePermission(req, "products:write");
  if (!perm.ok) return perm.response;

  const body = await req.json().catch(() => null);
  const parsed = ProductUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      sku: parsed.data.sku === "" ? null : parsed.data.sku,
      category: parsed.data.category === "" ? null : parsed.data.category,
      categoryId: parsed.data.categoryId === "" ? null : parsed.data.categoryId,
      unit: parsed.data.unit,
      cost: parsed.data.cost,
      price: parsed.data.price,

      stockMin: parsed.data.stockMin,
      leadTimeDays: parsed.data.leadTimeDays,
      coverageDays: parsed.data.coverageDays,
      safetyStock: parsed.data.safetyStock,

      currentStock: parsed.data.currentStock
    }
  });

  return NextResponse.json({ product: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const perm = requirePermission(req, "products:write");
  if (!perm.ok) return perm.response;

  await prisma.product.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
