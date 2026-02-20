import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultStore } from "@/lib/defaultStore";

export const MappingSchema = z.object({
  sku: z.string().optional().default(""),
  name: z.string().optional().default(""),
  stock: z.string().optional().default(""),
  cost: z.string().optional().default(""),
  price: z.string().optional().default(""),
  supplier: z.string().optional().default(""),
  category: z.string().optional().default("")
});

export type Mapping = z.infer<typeof MappingSchema>;

export type ImportResult = {
  created: number;
  updated: number;
  movementsCreated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

function parseNumberLoose(raw: string): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  // handle 1.234,56 and 1,234.56
  const cleaned = s
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function clampInt(v: number | null): number | null {
  if (v === null) return null;
  const n = Math.round(v);
  if (!Number.isFinite(n)) return null;
  return n < 0 ? 0 : n;
}

export async function importTabular(opts: {
  storeId?: string;
  headers: string[];
  rows: string[][];
  hasHeader: boolean;
  mapping: Mapping;
  note: string;
}): Promise<ImportResult> {
  const store = await getOrCreateDefaultStore();
  const storeId = opts.storeId || store.id;

  const headers = (opts.headers || []).map((h, idx) => (String(h ?? "").trim() || `Col ${idx + 1}`));
  const rows = opts.rows || [];
  const headerIndex = new Map(headers.map((h, i) => [h, i] as const));

  const idx = (h: string) => {
    if (!h) return -1;
    const i = headerIndex.get(h);
    return typeof i === "number" ? i : -1;
  };

  const get = (r: string[], h: string) => {
    const i = idx(h);
    return i >= 0 ? String(r[i] ?? "") : "";
  };

  let created = 0;
  let updated = 0;
  let movementsCreated = 0;
  let skipped = 0;
  const errors: Array<{ row: number; message: string }> = [];

  // Cache suppliers by normalized name
  const supplierCache = new Map<string, { id: string }>();

  // NOTE: inside prisma.$transaction callback, `tx` is a TransactionClient (not the full PrismaClient)
  // so helpers must accept Prisma.TransactionClient to keep TS happy.
  const ensureSupplier = async (tx: Prisma.TransactionClient, nameRaw: string) => {
    const name = String(nameRaw ?? "").trim();
    if (!name) return null;
    const key = name.toLowerCase();
    const cached = supplierCache.get(key);
    if (cached) return cached;

    const existing = await tx.supplier.findFirst({ where: { name } });
    if (existing) {
      supplierCache.set(key, { id: existing.id });
      return { id: existing.id };
    }

    const created = await tx.supplier.create({ data: { name } });
    supplierCache.set(key, { id: created.id });
    return { id: created.id };
  };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = opts.hasHeader ? i + 2 : i + 1;

    try {
      const sku = get(r, opts.mapping.sku).trim() || null;
      const name = get(r, opts.mapping.name).trim();
      if (!name && !sku) {
        skipped++;
        continue;
      }

      const category = get(r, opts.mapping.category).trim() || null;
      const supplierName = get(r, opts.mapping.supplier).trim();
      const cost = parseNumberLoose(get(r, opts.mapping.cost));
      const price = parseNumberLoose(get(r, opts.mapping.price));
      const stockParsed = clampInt(parseNumberLoose(get(r, opts.mapping.stock)));

      await prisma.$transaction(async (tx) => {
        const supplier = await ensureSupplier(tx, supplierName);

        let existingProduct = null as any;
        if (sku) {
          existingProduct = await tx.product.findFirst({ where: { storeId, sku } });
        }
        if (!existingProduct && name) {
          existingProduct = await tx.product.findFirst({ where: { storeId, name } });
        }

        const dataBase: any = {
          name: name || existingProduct?.name || "(sin nombre)",
          sku,
          category,
          ...(supplier ? { supplierId: supplier.id } : {}),
          ...(cost !== null ? { cost } : {}),
          ...(price !== null ? { price } : {})
        };

        let productId: string;

        if (existingProduct) {
          const updatedProduct = await tx.product.update({
            where: { id: existingProduct.id },
            data: {
              ...dataBase,
              ...(stockParsed !== null ? { currentStock: stockParsed } : {})
            }
          });
          productId = updatedProduct.id;
          updated++;
        } else {
          const createdProduct = await tx.product.create({
            data: {
              ...dataBase,
              storeId,
              currentStock: stockParsed ?? 0
            }
          });
          productId = createdProduct.id;
          created++;
        }

        if (stockParsed !== null) {
          await tx.inventoryMovement.create({
            data: {
              storeId,
              productId,
              type: "ADJUST",
              qty: stockParsed,
              note: opts.note
            }
          });
          movementsCreated++;
        }
      });
    } catch (e: any) {
      errors.push({ row: rowNum, message: e?.message || "Error" });
    }
  }

  return { created, updated, movementsCreated, skipped, errors };
}
