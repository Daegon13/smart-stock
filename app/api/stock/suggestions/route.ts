import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeSuggestions } from "@/lib/stock";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") || "";
  const lookbackDays = Number(searchParams.get("lookbackDays") || "30");
  const leadTimeDays = Number(searchParams.get("leadTimeDays") || "3");
  const safetyDays = Number(searchParams.get("safetyDays") || "4");
  const reviewDays = Number(searchParams.get("reviewDays") || "7");

  if (!storeId) return NextResponse.json({ error: "storeId requerido" }, { status: 400 });

  const products = await prisma.product.findMany({
    where: { storeId },
    select: {
      id: true,
      name: true,
      unit: true,
      cost: true,
      price: true,
      stockMin: true,
      currentStock: true,
      supplierId: true,
      category: true
    }
  });

  const movements = await prisma.inventoryMovement.findMany({
    where: { storeId },
    select: { productId: true, type: true, qty: true, createdAt: true }
  });

  const suggestions = computeSuggestions(products, movements as any, {
    lookbackDays: isFinite(lookbackDays) ? lookbackDays : 30,
    leadTimeDays: isFinite(leadTimeDays) ? leadTimeDays : 3,
    safetyDays: isFinite(safetyDays) ? safetyDays : 4,
    reviewDays: isFinite(reviewDays) ? reviewDays : 7
  });

  return NextResponse.json({ suggestions });
}
