import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { computeSuggestions, buildPurchaseMessage } from "@/lib/stock";
import { createOpenAITextResponse } from "@/lib/openai";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getRequestId, logApiEvent } from "@/lib/observability";

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const limit = enforceRateLimit({ req, route: "/api/ai/assistant", maxRequests: 30, windowMs: 60_000, requestId });
  if (!limit.ok) {
    logApiEvent({ requestId, route: "/api/ai/assistant", method: "POST", status: 429, message: "rate limited" });
    return limit.response;
  }

  const maxPromptLen = Number(process.env.MAX_PROMPT_LEN || "2000");
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "x-request-id": requestId } });

  const body = await req.json().catch(() => null);
  const storeId = body?.storeId || "";
  const question = body?.question || "";
  const model = typeof body?.model === "string" ? body.model : undefined;

  if (!storeId) {
    logApiEvent({ requestId, route: "/api/ai/assistant", method: "POST", status: 400, message: "missing storeId" });
    return json({ error: "storeId requerido" }, 400);
  }
  if (!question) {
    logApiEvent({ requestId, route: "/api/ai/assistant", method: "POST", storeId, status: 400, message: "missing question" });
    return json({ error: "question requerida" }, 400);
  }
  if (String(question).length > maxPromptLen) {
    logApiEvent({ requestId, route: "/api/ai/assistant", method: "POST", storeId, status: 400, message: "question too long" });
    return json({ error: `question demasiado larga (máx ${maxPromptLen} caracteres)` }, 400);
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    logApiEvent({ requestId, route: "/api/ai/assistant", method: "POST", storeId, status: 400, message: "invalid storeId" });
    return json({ error: "storeId inválido" }, 400);
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

  logApiEvent({ requestId, route: "/api/ai/assistant", method: "POST", storeId, status: 200, message: "ok" });

  return json({
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
