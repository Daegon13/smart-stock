import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { computeSuggestions, buildPurchaseMessage } from "@/lib/stock";
import { createOpenAITextResponse } from "@/lib/openai";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const limit = enforceRateLimit({ req, route: "/api/ai/assistant", maxRequests: 30, windowMs: 60_000 });
  if (!limit.ok) return limit.response;

  const body = await req.json().catch(() => null);
  const storeId = body?.storeId || "";
  const question = body?.question || "";
  const model = typeof body?.model === "string" ? body.model : undefined;

  if (!storeId) {
    return NextResponse.json({ error: "storeId requerido" }, { status: 400 });
  }
  if (!question) {
    return NextResponse.json({ error: "question requerida" }, { status: 400 });
  }
  if (String(question).length > 2000) {
    return NextResponse.json({ error: "question demasiado larga (máx 2000 caracteres)" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    return NextResponse.json({ error: "storeId inválido" }, { status: 400 });
  }

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
      category: true,
    },
  });

  const movements = await prisma.inventoryMovement.findMany({
    where: { storeId },
    select: { productId: true, type: true, qty: true, createdAt: true },
  });

  // NOTE:
  // computeSuggestions() usa `coverageDays` (no `reviewDays`).
  // `coverageDays` = cuántos días querés cubrir hasta la próxima reposición/revisión.
  const suggestions = computeSuggestions(products as any, movements as any, {
    lookbackDays: 30,
    leadTimeDays: 3,
    coverageDays: 7,
  });

  const urgent = suggestions
    .filter((s) => s.severity !== "ok")
    .slice(0, 12);

  const purchaseDraft = buildPurchaseMessage(
    urgent.map((u) => ({ name: u.name, qty: u.suggestedQty }))
  );

  const context = {
    store: store.name,
    now: new Date().toISOString(),
    kpis: {
      products: products.length,
      low: suggestions.filter((s) => s.severity === "low").length,
      soon: suggestions.filter((s) => s.severity === "soon").length,
    },
    urgent: urgent.map((u) => ({
      name: u.name,
      current: u.currentStock,
      min: u.stockMin,
      avgDailyOut: u.avgDailyOut,
      daysCover: u.daysCover,
      suggested: u.suggestedQty,
      reason: u.reason,
    })),
    purchaseDraft,
  };

  const system =
    "Sos un asistente de operaciones para un minimarket uruguayo.\n" +
    "Respondé en español, corto y accionable. " +
    "No inventes datos: usá solo lo que está en el contexto JSON.";

  const user = `Pregunta del usuario: ${question}\n\nContexto JSON (datos reales):\n${JSON.stringify(
    context,
    null,
    2
  )}`;

  const ai = await createOpenAITextResponse({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    model,
  });

  // Fallback sin IA: devolvemos una respuesta básica.
  const fallback =
    `Resumen (${store.name}):\n` +
    `- Productos: ${context.kpis.products}\n` +
    `- Críticos: ${context.kpis.low}\n` +
    `- Reponer pronto: ${context.kpis.soon}\n\n` +
    `Lista de compra sugerida (borrador):\n${purchaseDraft}`;

  return NextResponse.json({
    usedAI: ai.usedAI,
    answer: ai.usedAI
      ? ai.text || "(Respuesta vacía)"
      : ai.text
        ? `${ai.text}\n\n${fallback}`
        : fallback,
    context,
    modelUsed: model || process.env.OPENAI_MODEL || "gpt-5",
  });
}
