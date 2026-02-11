import { z } from "zod";

export const ProductCreateSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(2),
  sku: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  unit: z.string().optional().or(z.literal("")),
  cost: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  stockMin: z.coerce.number().int().min(0),
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
