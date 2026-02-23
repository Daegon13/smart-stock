import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeSuggestions } from "@/lib/stock";
import { getRequestId, logApiEvent } from "@/lib/observability";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "x-request-id": requestId } });

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") || "";
  const lookbackDays = Number(searchParams.get("lookbackDays") || "30");

  // Compat: si llegan estos params viejos, los usamos como defaults (fallback)
  const fallbackLead = Number(searchParams.get("leadTimeDays") || "3");
  const fallbackCoverage = Number(searchParams.get("coverageDays") || searchParams.get("reviewDays") || "14");
  const fallbackSafety = Number(searchParams.get("safetyStock") || searchParams.get("safetyDays") || "0");

  if (!storeId) {
    logApiEvent({ requestId, route: "/api/stock/suggestions", method: "GET", status: 400, message: "missing storeId" });
    return json({ error: "storeId requerido" }, 400);
  }

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

  const salesMovements = movements.filter((m) => m.type === "OUT");
  const productsMissingConfig = products.filter(
    (p) => (p.stockMin ?? 0) <= 0 || (p.coverageDays ?? 0) <= 0 || (p.leadTimeDays ?? 0) <= 0
  ).length;

  const alerts = {
    negativeStock: products
      .filter((p) => p.currentStock < 0)
      .map((p) => ({ productId: p.id, name: p.name, currentStock: p.currentStock })),
    anomalousMovements: [] as Array<{ productId: string; name: string; movementId: string; qty: number; threshold: number }>
  };

  const recent = await prisma.inventoryMovement.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, productId: true, qty: true, type: true, createdAt: true, product: { select: { name: true } } }
  });

  const byProduct = new Map<string, number[]>();
  for (const m of recent) {
    const qty = Math.max(0, m.qty);
    if (qty <= 0) continue;
    const arr = byProduct.get(m.productId) || [];
    arr.push(qty);
    byProduct.set(m.productId, arr);
  }

  for (const m of recent) {
    const values = byProduct.get(m.productId) || [];
    if (values.length < 5) continue;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const threshold = Math.max(10, avg * 4);
    if (m.qty > threshold) {
      alerts.anomalousMovements.push({
        productId: m.productId,
        name: m.product?.name || "Producto",
        movementId: m.id,
        qty: m.qty,
        threshold: Math.round(threshold)
      });
    }
  }

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

  const readiness = {
    productCount: products.length,
    salesCount: salesMovements.length,
    productsMissingConfig
  };

  logApiEvent({ requestId, route: "/api/stock/suggestions", method: "GET", storeId, status: 200, message: `suggestions=${suggestions.length}` });
  return json({ suggestions, alerts, readiness });
}
