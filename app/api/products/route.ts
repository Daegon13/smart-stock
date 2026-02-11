import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ProductCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") || "";
  if (!storeId) return NextResponse.json({ error: "storeId requerido" }, { status: 400 });

  const products = await prisma.product.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = ProductCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const store = await prisma.store.findUnique({ where: { id: data.storeId } });
  if (!store) return NextResponse.json({ error: "storeId inválido" }, { status: 400 });

  const created = await prisma.product.create({
    data: {
      storeId: data.storeId,
      name: data.name,
      sku: data.sku || null,
      category: data.category || null,
      unit: data.unit || "unidad",
      cost: data.cost,
      price: data.price,
      stockMin: data.stockMin,
      currentStock: data.currentStock
    }
  });

  return NextResponse.json({ product: created }, { status: 201 });
}
