import { getActiveStoreFromSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDefaultShowcaseStoreId, isDemoNoAuthAllowed } from "@/lib/runtimeFlags";

export async function getOrCreateDefaultStore() {
  const configuredStoreId = getDefaultShowcaseStoreId();
  if (configuredStoreId) {
    const configured = await prisma.store.findUnique({ where: { id: configuredStoreId } });
    if (configured) return configured;
  }

  if (isDemoNoAuthAllowed()) {
    const existing = await prisma.store.findFirst();
    if (existing) return existing;
    return prisma.store.create({ data: { name: "Demo Store" } });
  }

  return getActiveStoreFromSession();
}
