import { prisma } from "@/lib/db";

export async function getOrCreateDefaultStore() {
  const existing = await prisma.store.findFirst();
  if (existing) return existing;
  return prisma.store.create({ data: { name: "Demo Store" } });
}
