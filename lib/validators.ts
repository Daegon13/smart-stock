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
