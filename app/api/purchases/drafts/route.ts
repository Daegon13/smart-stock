import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PurchaseDraftCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") || "";
  if (!storeId) return NextResponse.json({ error: "storeId requerido" }, { status: 400 });

  const drafts = await prisma.purchaseDraft.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { supplier: { select: { name: true } } }
  });

  return NextResponse.json({
    drafts: drafts.map((d) => ({
      id: d.id,
      supplierName: d.supplier?.name ?? null,
      createdAt: d.createdAt.toISOString(),
      itemCount: d.itemCount
    }))
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = PurchaseDraftCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // validamos store
  const store = await prisma.store.findUnique({ where: { id: parsed.data.storeId } });
  if (!store) return NextResponse.json({ error: "storeId inválido" }, { status: 400 });

  // validamos supplier si viene
  const supplierId = parsed.data.supplierId ?? null;
  if (supplierId) {
    const sup = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!sup) return NextResponse.json({ error: "supplierId inválido" }, { status: 400 });
  }

  const created = await prisma.purchaseDraft.create({
    data: {
      storeId: parsed.data.storeId,
      supplierId,
      title: parsed.data.title && parsed.data.title.trim() ? parsed.data.title.trim() : "Borrador",
      message: parsed.data.message,
      csv: parsed.data.csv,
      itemCount: parsed.data.itemCount ?? 0
    }
  });

  return NextResponse.json({ draftId: created.id }, { status: 201 });
}
