import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeSuggestions } from "@/lib/stock";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") || "";
  const lookbackDays = Number(searchParams.get("lookbackDays") || "30");

  // Compat: si llegan estos params viejos, los usamos como defaults (fallback)
  const fallbackLead = Number(searchParams.get("leadTimeDays") || "3");
  const fallbackCoverage = Number(searchParams.get("coverageDays") || searchParams.get("reviewDays") || "14");
  const fallbackSafety = Number(searchParams.get("safetyStock") || searchParams.get("safetyDays") || "0");

  if (!storeId) return NextResponse.json({ error: "storeId requerido" }, { status: 400 });

  const products = await prisma.product.findMany({
    where: { storeId },
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      cost: true,
      price: true,
      stockMin: true,
      leadTimeDays: true,
      coverageDays: true,
      safetyStock: true,
      currentStock: true,
      supplierId: true,
      category: true,
      supplier: { select: { name: true, phone: true } }
    }
  });

  const movements = await prisma.inventoryMovement.findMany({
    where: { storeId },
    select: { productId: true, type: true, qty: true, createdAt: true }
  });

  // Meta para “empty states” inteligentes.
  const lb = Number.isFinite(lookbackDays) ? lookbackDays : 30;
  const from = Date.now() - lb * 24 * 60 * 60 * 1000;
  const outMovementsCount = movements.filter((m) => m.type === "OUT" && new Date(m.createdAt).getTime() >= from).length;
  const productsMissingMinCount = products.filter((p) => (p.stockMin ?? 0) <= 0).length;

  const mappedProducts = products.map(({ supplier, ...p }) => ({
    ...p,
    supplierName: supplier?.name ?? null,
    supplierPhone: supplier?.phone ?? null
  }));

  const suggestions = computeSuggestions(mappedProducts as any, movements as any, {
    lookbackDays: Number.isFinite(lookbackDays) ? lookbackDays : 30,
    leadTimeDays: Number.isFinite(fallbackLead) ? fallbackLead : 3,
    coverageDays: Number.isFinite(fallbackCoverage) ? fallbackCoverage : 14,
    safetyStock: Number.isFinite(fallbackSafety) ? fallbackSafety : 0
  });

  return NextResponse.json({
    suggestions,
    meta: {
      productCount: products.length,
      outMovementsCount,
      productsMissingMinCount,
      lookbackDays: lb
    }
  });
}
