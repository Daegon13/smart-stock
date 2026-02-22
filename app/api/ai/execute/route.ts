import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { normName } from "@/lib/posNormalize";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getRequestId, logApiEvent } from "@/lib/observability";

const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_purchase_order"),
    title: z.string().optional(),
    supplierId: z.string().nullable().optional(),
    supplierName: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    items: z.array(
      z.object({
        productId: z.string().min(1),
        qtyOrdered: z.number().min(0),
        unitCost: z.number().nullable().optional(),
        note: z.string().nullable().optional()
      })
    )
  }),
  z.object({
    type: z.literal("set_replenishment_params"),
    updates: z.array(
      z.object({
        productId: z.string().min(1),
        stockMin: z.number().optional(),
        leadTimeDays: z.number().optional(),
        coverageDays: z.number().optional(),
        safetyStock: z.number().optional()
      })
    )
  }),
  z.object({
    type: z.literal("create_category"),
    scope: z.string().min(1),
    name: z.string().min(1),
    color: z.string().nullable().optional(),
    icon: z.string().nullable().optional()
  }),
  z.object({
    type: z.literal("add_alias"),
    productId: z.string().min(1),
    kind: z.enum(["CODE", "NAME"]),
    key: z.string().min(1)
  }),
  z.object({ type: z.literal("none") })
]);

const BodySchema = z.object({
  storeId: z.string().min(1),
  actions: z.array(ActionSchema)
});

function slugify(s: string) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "x-request-id": requestId } });

  const limit = enforceRateLimit({ req, route: "/api/ai/execute", maxRequests: 20, windowMs: 60_000, requestId });
  if (!limit.ok) {
    logApiEvent({ requestId, route: "/api/ai/execute", method: "POST", status: 429, message: "rate limited" });
    return limit.response;
  }

  const perm = requirePermission(req, "ai:execute");
  if (!perm.ok) {
    logApiEvent({ requestId, route: "/api/ai/execute", method: "POST", status: 403, message: "permission denied ai:execute" });
    return perm.response;
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    logApiEvent({ requestId, route: "/api/ai/execute", method: "POST", status: 400, message: "invalid payload" });
    return json({ ok: false, error: parsed.error.flatten() }, 400);
  }

  const { storeId, actions } = parsed.data;
  if (actions.length > 20) {
    logApiEvent({ requestId, route: "/api/ai/execute", method: "POST", storeId, status: 400, message: "too many actions" });
    return json({ ok: false, error: "Máximo 20 acciones por request" }, 400);
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    logApiEvent({ requestId, route: "/api/ai/execute", method: "POST", storeId, status: 400, message: "invalid storeId" });
    return json({ ok: false, error: "storeId inválido" }, 400);
  }

  const ip = req.headers.get("x-forwarded-for") || null;
  const userAgent = req.headers.get("user-agent") || null;

  const results: Array<{ action: string; ok: boolean; detail?: any; error?: string }> = [];

  for (const a of actions) {
    const actionType = typeof (a as any)?.type === "string" ? (a as any).type : "unknown";
    if (a.type === "none") continue;

    try {
      if (a.type === "create_purchase_order") {
        // permisos finos
        const p2 = requirePermission(req, "orders:write");
        if (!p2.ok) {
          results.push({ action: "create_purchase_order", ok: false, error: "Sin permisos (orders:write)" });
          continue;
        }

        const productIds = Array.from(new Set(a.items.map((i) => i.productId)));
        const products = await prisma.product.findMany({
          where: { id: { in: productIds }, storeId },
          select: { id: true, storeId: true }
        });

        if (products.length !== productIds.length) {
          results.push({ action: "create_purchase_order", ok: false, error: "Hay productos inválidos para este local" });
          continue;
        }

        // supplier por nombre (opcional) si no viene supplierId
        let supplierId = a.supplierId ?? null;
        if (!supplierId && a.supplierName) {
          const existing = await prisma.supplier.findFirst({
            where: { name: { equals: a.supplierName, mode: "insensitive" } },
            select: { id: true }
          });
          if (existing) supplierId = existing.id;
        }

        const order = await prisma.purchaseOrder.create({
          data: {
            storeId,
            supplierId: supplierId || null,
            title: a.title?.trim() ? a.title.trim() : "Orden de compra (IA)",
            notes: a.notes?.trim() ? a.notes.trim() : null,
            status: "DRAFT",
            items: {
              create: a.items.map((i) => ({
                productId: i.productId,
                qtyOrdered: i.qtyOrdered,
                unitCost: typeof i.unitCost === "number" ? i.unitCost : null,
                note: i.note?.trim() ? i.note.trim() : null
              }))
            }
          },
          include: {
            supplier: { select: { id: true, name: true, phone: true } },
            items: { include: { product: { select: { name: true, sku: true, unit: true } } } }
          }
        });

        await writeAudit({
          storeId,
          role: perm.role,
          action: "ai.create_purchase_order",
          entity: "PurchaseOrder",
          entityId: order.id,
          payload: a,
          ip,
          userAgent
        });

        results.push({ action: "create_purchase_order", ok: true, detail: { id: order.id, title: order.title, itemCount: order.items.length } });
        continue;
      }

      if (a.type === "set_replenishment_params") {
        const p2 = requirePermission(req, "products:write");
        if (!p2.ok) {
          results.push({ action: "set_replenishment_params", ok: false, error: "Sin permisos (products:write)" });
          continue;
        }

        const ids = Array.from(new Set(a.updates.map((u) => u.productId)));
        const products = await prisma.product.findMany({ where: { id: { in: ids }, storeId }, select: { id: true } });
        if (products.length !== ids.length) {
          results.push({ action: "set_replenishment_params", ok: false, error: "Productos inválidos" });
          continue;
        }

        for (const u of a.updates) {
          await prisma.product.update({
            where: { id: u.productId },
            data: {
              ...(typeof u.stockMin === "number" ? { stockMin: u.stockMin } : {}),
              ...(typeof u.leadTimeDays === "number" ? { leadTimeDays: u.leadTimeDays } : {}),
              ...(typeof u.coverageDays === "number" ? { coverageDays: u.coverageDays } : {}),
              ...(typeof u.safetyStock === "number" ? { safetyStock: u.safetyStock } : {})
            }
          });
        }

        await writeAudit({
          storeId,
          role: perm.role,
          action: "ai.set_replenishment_params",
          entity: "Product",
          payload: a,
          ip,
          userAgent
        });

        results.push({ action: "set_replenishment_params", ok: true, detail: { updated: a.updates.length } });
        continue;
      }

      if (a.type === "create_category") {
        const p2 = requirePermission(req, "categories:write");
        if (!p2.ok) {
          results.push({ action: "create_category", ok: false, error: "Sin permisos (categories:write)" });
          continue;
        }

        const slug = slugify(a.name);

        const cat = await prisma.category.upsert({
          where: { storeId_scope_slug: { storeId, scope: a.scope, slug } },
          create: { storeId, scope: a.scope, name: a.name, slug, color: a.color || null, icon: a.icon || null },
          update: { name: a.name, color: a.color || null, icon: a.icon || null }
        });

        await writeAudit({
          storeId,
          role: perm.role,
          action: "ai.create_category",
          entity: "Category",
          entityId: cat.id,
          payload: a,
          ip,
          userAgent
        });

        results.push({ action: "create_category", ok: true, detail: { id: cat.id, name: cat.name, scope: cat.scope } });
        continue;
      }

      if (a.type === "add_alias") {
        const p2 = requirePermission(req, "aliases:write");
        if (!p2.ok) {
          results.push({ action: "add_alias", ok: false, error: "Sin permisos (aliases:write)" });
          continue;
        }

        const product = await prisma.product.findFirst({ where: { id: a.productId, storeId }, select: { id: true } });
        if (!product) {
          results.push({ action: "add_alias", ok: false, error: "Producto inválido" });
          continue;
        }

        const finalKey = a.kind === "NAME" ? normName(a.key) : a.key.trim();

        const alias = await prisma.productAlias.upsert({
          where: { storeId_kind_key: { storeId, kind: a.kind, key: finalKey } },
          create: { storeId, productId: a.productId, kind: a.kind, key: finalKey },
          update: { productId: a.productId }
        });

        await writeAudit({
          storeId,
          role: perm.role,
          action: "ai.add_alias",
          entity: "ProductAlias",
          entityId: alias.id,
          payload: a,
          ip,
          userAgent
        });

        results.push({ action: "add_alias", ok: true, detail: { id: alias.id, kind: alias.kind, key: alias.key } });
        continue;
      }

      results.push({ action: actionType, ok: false, error: "Acción no soportada" });
    } catch (e: any) {
      results.push({ action: actionType, ok: false, error: e?.message || "Error ejecutando acción" });
    }
  }

  const ok = results.every((r) => r.ok);
  logApiEvent({ requestId, route: "/api/ai/execute", method: "POST", storeId, status: ok ? 200 : 207, message: `actions processed: ${results.length}` });

  return json({ ok, results }, ok ? 200 : 207);
}
