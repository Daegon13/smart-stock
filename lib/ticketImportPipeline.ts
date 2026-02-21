import { prisma } from "@/lib/db";
import { z } from "zod";
import { codeVariants, normName } from "@/lib/posNormalize";

export const TicketMappingSchema = z.object({
  ticketId: z.string().optional().default(""),
  issuedAt: z.string().optional().default(""),
  sku: z.string().optional().default(""),
  name: z.string().optional().default(""),
  qty: z.string().optional().default(""),
  unitPrice: z.string().optional().default(""),
  lineTotal: z.string().optional().default(""),
  ticketTotal: z.string().optional().default("")
});
export type TicketMapping = z.infer<typeof TicketMappingSchema>;

function safeStr(v: unknown) {
  const s = String(v ?? "").trim();
  return s;
}

function parseIntLoose(raw: unknown): number | null {
  const s = safeStr(raw);
  if (!s) return null;
  const cleaned = s
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function parseNumberLoose(raw: unknown): number | null {
  const s = safeStr(raw);
  if (!s) return null;
  const cleaned = s
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDateLoose(raw: unknown): Date | null {
  const s = safeStr(raw);
  if (!s) return null;

  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  // dd/mm/yyyy hh:mm
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
    const hh = m[4] ? Number(m[4]) : 0;
    const mi = m[5] ? Number(m[5]) : 0;
    const d = new Date(yyyy, mm - 1, dd, hh, mi);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function stableHash(s: string) {
  // hash simple y estable (para dedupe). No cripto, solo consistencia.
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export async function importTicketsTabular(opts: {
  storeId?: string;
  headers: string[];
  rows: string[][];
  hasHeader: boolean;
  mapping: TicketMapping;
  fileName?: string;
  delimiter?: string;
}) {
  if (!opts.storeId) {
    return {
      batchId: "",
      ticketsCreated: 0,
      ticketsDuplicated: 0,
      linesCreated: 0,
      movementsCreated: 0,
      unmatchedLines: 0,
      skippedLines: 0,
      errors: [{ row: 0, message: "storeId requerido" }],
      topSold: [] as Array<{ productId: string; name: string; qty: number }>
    };
  }

  const storeId = opts.storeId;
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    return {
      batchId: "",
      ticketsCreated: 0,
      ticketsDuplicated: 0,
      linesCreated: 0,
      movementsCreated: 0,
      unmatchedLines: 0,
      skippedLines: 0,
      errors: [{ row: 0, message: "storeId inválido" }],
      topSold: [] as Array<{ productId: string; name: string; qty: number }>
    };
  }

  const mapping = TicketMappingSchema.parse(opts.mapping);
  const idxOf = (h: string) => opts.headers.findIndex((x) => x === h);
  const colIndex: Record<keyof TicketMapping, number> = {
    ticketId: mapping.ticketId ? idxOf(mapping.ticketId) : -1,
    issuedAt: mapping.issuedAt ? idxOf(mapping.issuedAt) : -1,
    sku: mapping.sku ? idxOf(mapping.sku) : -1,
    name: mapping.name ? idxOf(mapping.name) : -1,
    qty: mapping.qty ? idxOf(mapping.qty) : -1,
    unitPrice: mapping.unitPrice ? idxOf(mapping.unitPrice) : -1,
    lineTotal: mapping.lineTotal ? idxOf(mapping.lineTotal) : -1,
    ticketTotal: mapping.ticketTotal ? idxOf(mapping.ticketTotal) : -1
  };

  if (colIndex.qty < 0) {
    return {
      batchId: "",
      ticketsCreated: 0,
      ticketsDuplicated: 0,
      linesCreated: 0,
      movementsCreated: 0,
      unmatchedLines: 0,
      skippedLines: 0,
      errors: [{ row: 0, message: "Falta mapear Cantidad (qty)" }],
      topSold: [] as Array<{ productId: string; name: string; qty: number }>
    };
  }
  if (colIndex.sku < 0 && colIndex.name < 0) {
    return {
      batchId: "",
      ticketsCreated: 0,
      ticketsDuplicated: 0,
      linesCreated: 0,
      movementsCreated: 0,
      unmatchedLines: 0,
      skippedLines: 0,
      errors: [{ row: 0, message: "Mapeá al menos SKU/Código o Nombre del producto" }],
      topSold: [] as Array<{ productId: string; name: string; qty: number }>
    };
  }

  const batch = await prisma.ticketImportBatch.create({
    data: {
      storeId,
      source: "CSV",
      fileName: opts.fileName || null,
      notes: "Import tickets",
      ticketsCount: 0,
      linesCount: 0,
      movementsCount: 0,
      skippedCount: 0,
      duplicatesCount: 0,
      errorCount: 0,
      unmatchedLines: 0
    }
  });

  // Productos + alias
  const products = await prisma.product.findMany({
    where: { storeId },
    select: { id: true, name: true, sku: true, currentStock: true }
  });

  const skuMap = new Map<string, (typeof products)[number]>();
  const nameMap = new Map<string, (typeof products)[number]>();
  for (const p of products) {
    const sku = safeStr(p.sku);
    if (sku) {
      for (const v of codeVariants(sku)) skuMap.set(v, p);
    }
    nameMap.set(normName(p.name), p);
  }

  const aliases = await prisma.productAlias.findMany({
    where: { storeId },
    select: {
      kind: true,
      key: true,
      product: { select: { id: true, name: true, sku: true, currentStock: true } }
    }
  });
  const aliasCode = new Map<string, (typeof products)[number]>();
  const aliasName = new Map<string, (typeof products)[number]>();
  for (const a of aliases) {
    if (!a?.product) continue;
    if (a.kind === "CODE") {
      for (const v of codeVariants(a.key)) aliasCode.set(v, a.product);
    }
    if (a.kind === "NAME") aliasName.set(a.key, a.product);
  }

  // Agrupar filas por ticket
  type LineIn = {
    rowIndex: number;
    ticketId: string;
    issuedAt: Date | null;
    sku: string;
    name: string;
    qty: number;
    unitPrice: number | null;
    lineTotal: number | null;
    ticketTotal: number | null;
  };

  const lines: LineIn[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < opts.rows.length; i++) {
    const r = opts.rows[i];
    const rowIndex = opts.hasHeader ? i + 2 : i + 1;

    const ticketId = colIndex.ticketId >= 0 ? safeStr(r[colIndex.ticketId]) : "";
    const issuedAt = colIndex.issuedAt >= 0 ? parseDateLoose(r[colIndex.issuedAt]) : null;
    const sku = colIndex.sku >= 0 ? safeStr(r[colIndex.sku]) : "";
    const name = colIndex.name >= 0 ? safeStr(r[colIndex.name]) : "";
    const qty = parseIntLoose(r[colIndex.qty]);
    const unitPrice = colIndex.unitPrice >= 0 ? parseNumberLoose(r[colIndex.unitPrice]) : null;
    const lineTotal = colIndex.lineTotal >= 0 ? parseNumberLoose(r[colIndex.lineTotal]) : null;
    const ticketTotal = colIndex.ticketTotal >= 0 ? parseNumberLoose(r[colIndex.ticketTotal]) : null;

    if (qty === null) {
      errors.push({ row: rowIndex, message: "Cantidad inválida" });
      continue;
    }
    if (!sku && !name) {
      // líneas tipo bolsa / recargo sin producto: las guardamos como UNMATCH para permitir conciliación opcional
      errors.push({ row: rowIndex, message: "Falta SKU/Código y Nombre" });
      continue;
    }

    lines.push({ rowIndex, ticketId, issuedAt, sku, name, qty, unitPrice, lineTotal, ticketTotal });
  }

  // Agrupamos por ticket key (ticketId si existe; si no, por issuedAt + total + primeras 2 líneas)
  const grouped = new Map<string, LineIn[]>();
  for (const ln of lines) {
    const keyBase = ln.ticketId
      ? `id:${ln.ticketId}`
      : `t:${ln.issuedAt?.toISOString() || ""}|tot:${ln.ticketTotal ?? ""}`;
    const key = keyBase;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ln);
  }

  let ticketsCreated = 0;
  let ticketsDuplicated = 0;
  let linesCreated = 0;
  let movementsCreated = 0;
  let unmatchedLines = 0;
  let skippedLines = 0;

  const perProductQty = new Map<string, { productId: string; name: string; qty: number }>();

  for (const [ticketKey, ticketLines] of grouped.entries()) {
    // Construimos un hash estable del ticket
    const stable = [
      ticketLines[0]?.ticketId || "",
      ticketLines[0]?.issuedAt?.toISOString() || "",
      String(ticketLines[0]?.ticketTotal ?? ""),
      ...ticketLines
        .slice(0, 10)
        .map((x) => `${x.sku}|${x.name}|${x.qty}|${x.unitPrice ?? ""}|${x.lineTotal ?? ""}`)
    ].join("||");
    const hash = stableHash(stable);

    // Dedupe: si el ticket ya existe, lo contamos y saltamos
    const existing = await prisma.ticket.findUnique({
      where: { storeId_hash: { storeId, hash } }
    });
    if (existing) {
      ticketsDuplicated++;
      continue;
    }

    const externalId = ticketLines[0]?.ticketId || null;
    const issuedAt = ticketLines[0]?.issuedAt || null;

    const createdTicket = await prisma.ticket.create({
      data: {
        storeId,
        batchId: batch.id,
        externalId,
        issuedAt,
        total: ticketLines[0]?.ticketTotal ?? null,
        hash
      }
    });
    ticketsCreated++;

    // Insertamos líneas. Si no matchea producto, queda para conciliación.
    // Si matchea, acumulamos OUT para ajustar stock.
    const movementOps: Array<{ productId: string; qty: number; note: string }> = [];

    for (const ln of ticketLines) {
      const code = safeStr(ln.sku);
      const nm = safeStr(ln.name);
      const nmKey = nm ? normName(nm) : "";

      let product: (typeof products)[number] | null = null;
      let matchedBy: string | null = null;

      if (code) {
        for (const v of codeVariants(code)) {
          if (aliasCode.has(v)) {
            product = aliasCode.get(v)!;
            matchedBy = "ALIAS_CODE";
            break;
          }
          if (skuMap.has(v)) {
            product = skuMap.get(v)!;
            matchedBy = "SKU";
            break;
          }
        }
      }

      if (!product && nmKey && aliasName.has(nmKey)) {
        product = aliasName.get(nmKey)!;
        matchedBy = "ALIAS_NAME";
      } else if (!product && nmKey && nameMap.has(nmKey)) {
        product = nameMap.get(nmKey)!;
        matchedBy = "NAME";
      }

      const createdLine = await prisma.ticketLine.create({
        data: {
          ticketId: createdTicket.id,
          productId: product?.id || null,
          sku: code || null,
          name: nm || null,
          qty: ln.qty,
          unitPrice: ln.unitPrice ?? null,
          lineTotal: ln.lineTotal ?? null,
          matchedBy,
          resolvedAt: product ? new Date() : null
        }
      });
      linesCreated++;

      if (!product) {
        unmatchedLines++;
        continue;
      }

      // acumulamos por producto: ventas => OUT
      const totalQty = Math.abs(ln.qty);
      const note = `Venta ticket ${externalId || createdTicket.id}`;
      movementOps.push({ productId: product.id, qty: totalQty, note });

      const prev = perProductQty.get(product.id);
      if (prev) prev.qty += totalQty;
      else perProductQty.set(product.id, { productId: product.id, name: product.name, qty: totalQty });

      // Actualizamos stock en memoria (para que la próxima línea en el mismo import vea stock aproximado)
      product.currentStock = Math.max(0, (product.currentStock ?? 0) - totalQty);
    }

    // Creamos movimientos agregados por producto dentro del ticket
    const agg = new Map<string, { qty: number; notes: string[] }>();
    for (const m of movementOps) {
      const cur = agg.get(m.productId) || { qty: 0, notes: [] };
      cur.qty += m.qty;
      if (cur.notes.length < 5) cur.notes.push(m.note);
      agg.set(m.productId, cur);
    }

    for (const [productId, info] of agg.entries()) {
      await prisma.inventoryMovement.create({
        data: {
          storeId,
          productId,
          importBatchId: batch.id,
          type: "OUT",
          qty: info.qty,
          note: info.notes.join(" · ")
        }
      });
      movementsCreated++;

      // actualizar stock persistido
      const p = products.find((x) => x.id === productId);
      if (p) {
        await prisma.product.update({
          where: { id: productId },
          data: { currentStock: Math.max(0, (p.currentStock ?? 0)) }
        });
      }
    }
  }

  await prisma.ticketImportBatch.update({
    where: { id: batch.id },
    data: {
      ticketsCount: ticketsCreated,
      linesCount: linesCreated,
      movementsCount: movementsCreated,
      skippedCount: skippedLines,
      duplicatesCount: ticketsDuplicated,
      errorCount: errors.length,
      unmatchedLines
    }
  });

  const topSold = Array.from(perProductQty.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  return {
    batchId: batch.id,
    ticketsCreated,
    ticketsDuplicated,
    linesCreated,
    movementsCreated,
    unmatchedLines,
    skippedLines,
    errors,
    topSold
  };
}
