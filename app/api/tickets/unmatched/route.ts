import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function norm(s: string) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string) {
  return norm(s)
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function scoreName(a: string, b: string) {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union ? inter / union : 0;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId") || "";
  const batchId = url.searchParams.get("batchId");

  if (!storeId) {
    return NextResponse.json({ error: { message: "storeId requerido" } }, { status: 400 });
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    return NextResponse.json({ error: { message: "storeId inválido" } }, { status: 400 });
  }

  const lines = await prisma.ticketLine.findMany({
    where: {
      productId: null,
      ticket: {
        storeId,
        ...(batchId ? { batchId } : {})
      }
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      ticket: { select: { id: true, externalId: true, issuedAt: true, total: true, batchId: true } }
    }
  });

  const products = await prisma.product.findMany({
    where: { storeId },
    select: { id: true, name: true, sku: true }
  });

  const out = lines.map((ln) => {
    const nm = ln.name || "";
    const suggestions = products
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        score: nm ? scoreName(nm, p.name) : 0
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      id: ln.id,
      sku: ln.sku,
      name: ln.name,
      qty: ln.qty,
      unitPrice: ln.unitPrice,
      lineTotal: ln.lineTotal,
      ticket: {
        id: ln.ticket.id,
        externalId: ln.ticket.externalId,
        issuedAt: ln.ticket.issuedAt ? ln.ticket.issuedAt.toISOString() : null,
        total: ln.ticket.total,
        batchId: ln.ticket.batchId
      },
      suggestions
    };
  });

  return NextResponse.json({ lines: out });
}
