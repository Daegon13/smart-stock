import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ProductCreateSchema } from "@/lib/validators";
import { canMutate, withActiveStore } from "@/lib/apiAuth";

export async function GET() {
  return withActiveStore(async ({ storeId }) => {
    const products = await prisma.product.findMany({ where: { storeId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ products });
  });
}

export async function POST(req: Request) {
  return withActiveStore(async ({ storeId, role }) => {
    if (!canMutate(role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = ProductCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;
    const created = await prisma.product.create({
      data: {
        storeId,
        name: data.name,
        sku: data.sku || null,
        category: data.category || null,
        categoryId: data.categoryId ? data.categoryId : null,
        unit: data.unit || "unidad",
        cost: data.cost,
        price: data.price,
        stockMin: data.stockMin,
        leadTimeDays: data.leadTimeDays ?? 3,
        coverageDays: data.coverageDays ?? 14,
        safetyStock: data.safetyStock ?? 0,
        currentStock: data.currentStock
      }
    });

    return NextResponse.json({ product: created }, { status: 201 });
  });
}
