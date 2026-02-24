import { getActiveStoreFromSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function getOrCreateDefaultStore() {
  if (process.env.ALLOW_DEMO_NO_AUTH === "true" && process.env.NODE_ENV !== "production") {
    const existing = await prisma.store.findFirst();
    if (existing) return existing;
    return prisma.store.create({ data: { name: "Demo Store" } });
  }

  return getActiveStoreFromSession();
}
