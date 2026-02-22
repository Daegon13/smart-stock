import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeSuggestions } from "@/lib/stock";
import { createOpenAIJSONResponse } from "@/lib/openai";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getRequestId, logApiEvent } from "@/lib/observability";

const OutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["message", "actions"],
  properties: {
    message: { type: "string" },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type"],
        properties: {
          type: {
            type: "string",
            enum: ["create_purchase_order", "set_replenishment_params", "create_category", "add_alias", "none"]
          },

          // create_purchase_order
          title: { type: "string" },
          supplierId: { type: ["string", "null"] },
          supplierName: { type: ["string", "null"] },
          notes: { type: ["string", "null"] },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["productId", "qtyOrdered"],
              properties: {
                productId: { type: "string" },
                qtyOrdered: { type: "number" },
                unitCost: { type: ["number", "null"] },
                note: { type: ["string", "null"] }
              }
            }
          },

          // set_replenishment_params
          updates: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["productId"],
              properties: {
                productId: { type: "string" },
                stockMin: { type: "number" },
                leadTimeDays: { type: "number" },
                coverageDays: { type: "number" },
                safetyStock: { type: "number" }
              }
            }
          },

          // create_category
          scope: { type: "string" },
          name: { type: "string" },
          color: { type: ["string", "null"] },
          icon: { type: ["string", "null"] },

          // add_alias
          productId: { type: "string" },
          kind: { type: "string", enum: ["CODE", "NAME"] },
          key: { type: "string" }
        }
      }
    }
  }
};

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const limit = enforceRateLimit({ req, route: "/api/ai/copilot", maxRequests: 30, windowMs: 60_000, requestId });
  if (!limit.ok) {
    logApiEvent({ requestId, route: "/api/ai/copilot", method: "POST", status: 429, message: "rate limited" });
    return limit.response;
  }

  const maxPromptLen = Number(process.env.MAX_PROMPT_LEN || "2000");
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "x-request-id": requestId } });

  const body = await req.json().catch(() => null);
  const storeId = body?.storeId || "";
  const question = body?.question || "";
  const model = typeof body?.model === "string" ? body.model : undefined;

  if (!storeId) {
    logApiEvent({ requestId, route: "/api/ai/copilot", method: "POST", status: 400, message: "missing storeId" });
    return json({ error: "storeId requerido" }, 400);
  }
  if (!question) {
    logApiEvent({ requestId, route: "/api/ai/copilot", method: "POST", storeId, status: 400, message: "missing question" });
    return json({ error: "question requerida" }, 400);
  }
  if (String(question).length > maxPromptLen) {
    logApiEvent({ requestId, route: "/api/ai/copilot", method: "POST", storeId, status: 400, message: "question too long" });
    return json({ error: `question demasiado larga (máx ${maxPromptLen} caracteres)` }, 400);
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    logApiEvent({ requestId, route: "/api/ai/copilot", method: "POST", storeId, status: 400, message: "invalid storeId" });
    return json({ error: "storeId inválido" }, 400);
  }

  // Contexto operativo (mínimo, pero vendible)
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
      categoryId: true
    }
  });

  const movements = await prisma.inventoryMovement.findMany({
    where: { storeId },
    select: { productId: true, type: true, qty: true, createdAt: true }
  });

  const suggestions = computeSuggestions(products as any, movements as any);
  const urgent = suggestions.filter((s) => s.severity !== "ok").slice(0, 12);

  const unmatchedTickets = await prisma.ticketLine.count({
    where: { productId: null, ticket: { storeId } }
  });

  const pendingOrders = await prisma.purchaseOrder.count({
    where: { storeId, status: { in: ["DRAFT", "SENT", "PARTIAL"] } }
  });

  const context = {
    store: { id: store.id, name: store.name },
    now: new Date().toISOString(),
    kpis: {
      products: products.length,
      low: suggestions.filter((s) => s.severity === "low").length,
      soon: suggestions.filter((s) => s.severity === "soon").length,
      unmatchedTickets,
      pendingOrders
    },
    urgent: urgent.map((u) => ({
      productId: u.productId,
      name: u.name,
      current: u.currentStock,
      min: u.stockMin,
      avgDailyOut: u.avgDailyOut,
      daysCover: u.daysCover,
      suggested: u.suggestedQty,
      reason: u.reason
    }))
  };

  const system =
    "Sos un copiloto operativo para un minimarket uruguayo. " +
    "Tu trabajo: explicar claro y proponer acciones concretas para ejecutar en el sistema. " +
    "Reglas: no inventes datos; usá solo el JSON de contexto. " +
    "Si faltan datos, proponé el plan igual pero con acciones vacías o 'none'. " +
    "Importante: SOLO devolvé JSON que cumpla el schema. " +
    "Acciones permitidas: create_purchase_order, set_replenishment_params, create_category, add_alias, none.";

  const user =
    `Pregunta: ${question}\n\n` +
    `Contexto JSON (datos reales):\n${JSON.stringify(context, null, 2)}`;

  const ai = await createOpenAIJSONResponse<{ message: string; actions: any[] }>({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    schema: OutputSchema,
    model
  });

  // Fallback (sin IA)
  const fallback =
    `Resumen (${store.name}):\n` +
    `- Productos: ${context.kpis.products}\n` +
    `- Críticos: ${context.kpis.low}\n` +
    `- Reponer pronto: ${context.kpis.soon}\n` +
    `- Tickets sin conciliar: ${context.kpis.unmatchedTickets}\n` +
    `- Órdenes pendientes: ${context.kpis.pendingOrders}\n\n` +
    `Sugeridos (top):\n` +
    urgent.map((u) => `- ${u.name}: sugerido ${u.suggestedQty}`).join("\n");

  const message = ai.usedAI && ai.parsed?.message ? ai.parsed.message : fallback;
  const actions = ai.usedAI && Array.isArray(ai.parsed?.actions) ? ai.parsed.actions : [{ type: "none" }];

  logApiEvent({ requestId, route: "/api/ai/copilot", method: "POST", storeId, status: 200, message: "ok" });

  return json({
    usedAI: ai.usedAI,
    modelUsed: model || process.env.OPENAI_MODEL || "gpt-5",
    message,
    actions,
    context,
    error: ai.usedAI ? undefined : ai.error
  });
}
