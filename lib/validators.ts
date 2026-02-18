import { z } from "zod";

export const ProductCreateSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(2),
  sku: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  unit: z.string().optional().or(z.literal("")),
  cost: z.coerce.number().min(0),
  price: z.coerce.number().min(0),

  stockMin: z.coerce.number().int().min(0),
  leadTimeDays: z.coerce.number().int().min(0).optional().default(3),
  coverageDays: z.coerce.number().int().min(0).optional().default(14),
  safetyStock: z.coerce.number().int().min(0).optional().default(0),

  currentStock: z.coerce.number().int().min(0)
});

export const ProductUpdateSchema = ProductCreateSchema.partial().extend({
  id: z.string().min(1).optional()
});

export const MovementCreateSchema = z.object({
  storeId: z.string().min(1),
  productId: z.string().min(1),
  type: z.enum(["IN", "OUT", "ADJUST"]),
  qty: z.coerce.number().int().min(0),
  note: z.string().optional().or(z.literal(""))
});

export const PurchaseDraftCreateSchema = z.object({
  storeId: z.string().min(1),
  supplierId: z.string().optional().nullable(),
  title: z.string().optional().or(z.literal("")),
  message: z.string().min(1),
  csv: z.string().min(1),
  itemCount: z.coerce.number().int().min(0).optional().default(0)
});

export const PurchaseOrderCreateSchema = z.object({
  storeId: z.string().min(1),
  supplierId: z.string().optional().nullable(),
  title: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qtyOrdered: z.coerce.number().int().min(1),
        unitCost: z.coerce.number().min(0).optional(),
        note: z.string().optional().or(z.literal(""))
      })
    )
    .min(1)
});

export const PurchaseOrderReceiveSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        qty: z.coerce.number().int().min(1)
      })
    )
    .min(1)
});
