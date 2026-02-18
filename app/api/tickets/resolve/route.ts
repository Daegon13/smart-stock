import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { codeVariants, normName } from "@/lib/posNormalize";
import { requirePermission } from "@/lib/rbac";

const BodySchema = z.object({
  storeId: z.string().min(1),
  lineId: z.string().min(1),
  productId: z.string().min(1),
  applyToSameCode: z.boolean().optional().default(false),
  applyToSameName: z.boolean().optional().default(false),
  applyToNameFamily: z.boolean().optional().default(false),
  familyKey: z.string().optional().default(""),
  saveCodeAlias: z.boolean().optional().default(true),
  saveNameAlias: z.boolean().optional().default(false)
});

export async function POST(req: Request) {
  const perm = requirePermission(req, "tickets:reconcile");
  if (!perm.ok) return perm.response;

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Payload inválido", detail: parsed.error.flatten() } }, { status: 400 });
  }

  const { storeId, lineId, productId, applyToSameCode, applyToSameName, applyToNameFamily, familyKey, saveCodeAlias, saveNameAlias } = parsed.data;

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    return NextResponse.json({ error: { message: "storeId inválido" } }, { status: 400 });
  }

  const baseLine = await prisma.ticketLine.findFirst({
    where: { id: lineId, productId: null, ticket: { storeId } },
    include: { ticket: { select: { id: true, externalId: true } } }
  });

  if (!baseLine) {
    return NextResponse.json({ error: { message: "Línea no encontrada o ya conciliada" } }, { status: 404 });
  }

  const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
  if (!product) {
    return NextResponse.json({ error: { message: "Producto inválido" } }, { status: 400 });
  }

  const idsToResolve = new Set<string>([baseLine.id]);

  // 1) aplicar a todas las líneas con el MISMO código (con heurísticas de ceros/formatos)
  if (applyToSameCode && baseLine.sku) {
    const variants = codeVariants(baseLine.sku);
    if (variants.length) {
      const same = await prisma.ticketLine.findMany({
        where: {
          productId: null,
          sku: { in: variants },
          ticket: { storeId }
        },
        select: { id: true }
      });
      for (const s of same) idsToResolve.add(s.id);
    }
  }

  // 2) aplicar a todas las líneas con el MISMO nombre (normalizado)
  if (applyToSameName && baseLine.name) {
    const base = normName(baseLine.name);
    const token = base.split(" ")[0] || "";
    const candidates = await prisma.ticketLine.findMany({
      where: {
        productId: null,
        name: token ? { contains: token } : { not: null },
        ticket: { storeId }
      },
      select: { id: true, name: true }
    });

    for (const c of candidates) {
      if (!c.name) continue;
      if (normName(c.name) === base) idsToResolve.add(c.id);
    }
  }

  // 3) aplicar por FAMILIA (contiene palabra clave)
  if (applyToNameFamily) {
    const key = normName(familyKey || baseLine.name || "");
    if (key) {
      const token = key.split(" ")[0] || "";
      const candidates = await prisma.ticketLine.findMany({
        where: {
          productId: null,
          name: token ? { contains: token } : { not: null },
          ticket: { storeId }
        },
        select: { id: true, name: true }
      });

      for (const c of candidates) {
        if (!c.name) continue;
        const n = normName(c.name);
        if (n.includes(key)) idsToResolve.add(c.id);
      }
    }
  }

  const idsToResolveArr = Array.from(idsToResolve);

  // cargamos todas las líneas (para crear movimientos + nota)
  const lines = await prisma.ticketLine.findMany({
    where: { id: { in: idsToResolveArr }, productId: null, ticket: { storeId } },
    include: { ticket: { select: { id: true, externalId: true } } }
  });

  if (lines.length === 0) {
    return NextResponse.json({ error: { message: "No hay líneas pendientes para conciliar" } }, { status: 400 });
  }

  const now = new Date();

  // total por producto (acá solo uno, pero dejamos preparado)
  const totalQty = lines.reduce((acc, l) => acc + Math.abs(l.qty), 0);
  const ticketRefs = Array.from(
    new Set(lines.map((l) => (l.ticket.externalId ? `#${l.ticket.externalId}` : l.ticket.id.slice(0, 6))))
  ).slice(0, 8);
  const note = `Reconciliación tickets ${ticketRefs.join(", ")}`;

  const codeKey = (baseLine.sku || "").trim();
  const nameKey = baseLine.name ? normName(baseLine.name) : "";

  const result = await prisma.$transaction(async (tx) => {
    await tx.ticketLine.updateMany({
      where: { id: { in: lines.map((l) => l.id) } },
      data: {
        productId,
        resolvedAt: now,
        matchedBy: "MANUAL"
      }
    });

    // movimientos OUT (ahora sí descontamos stock)
    await tx.inventoryMovement.create({
      data: {
        storeId,
        productId,
        type: "OUT",
        qty: totalQty,
        note
      }
    });

    const fresh = await tx.product.findUnique({ where: { id: productId } });
    const current = fresh?.currentStock ?? 0;
    await tx.product.update({
      where: { id: productId },
      data: { currentStock: Math.max(0, current - totalQty) }
    });

    let aliasesTouched = 0;

    if (saveCodeAlias && codeKey) {
      const variants = codeVariants(codeKey);
      for (const v of variants) {
        await tx.productAlias.upsert({
          where: { storeId_kind_key: { storeId, kind: "CODE", key: v } },
          create: { storeId, productId, kind: "CODE", key: v },
          update: { productId }
        });
      }
      aliasesTouched += variants.length || 0;
    }

    if (saveNameAlias && nameKey) {
      await tx.productAlias.upsert({
        where: { storeId_kind_key: { storeId, kind: "NAME", key: nameKey } },
        create: { storeId, productId, kind: "NAME", key: nameKey },
        update: { productId }
      });
      aliasesTouched++;
    }

    return { resolvedCount: lines.length, movementQty: totalQty, aliasesTouched };
  });

  return NextResponse.json({ ok: true, ...result });
}
