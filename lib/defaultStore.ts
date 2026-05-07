import { getActiveStoreFromSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getDefaultShowcaseStoreId,
  isDemoNoAuthAllowed,
  isShowcaseMode,
  shouldBypassLogin,
} from "@/lib/runtimeFlags";
import {
  LOCAL_DEMO_STORE_NAME,
  SHOWCASE_STORE_REQUIRED_ERROR,
  findShowcaseStore,
} from "@/lib/showcaseStore";

async function findConfiguredStore() {
  const configuredStoreId = getDefaultShowcaseStoreId();
  if (!configuredStoreId) return null;
  return prisma.store.findUnique({ where: { id: configuredStoreId } });
}

export async function getOrCreateDefaultStore() {
  if (isShowcaseMode()) {
    const demo = await findShowcaseStore({
      allowLocalFallback: true,
      allowLocalCreate: true,
    });
    if (demo) return demo;

    throw new Error(SHOWCASE_STORE_REQUIRED_ERROR);
  }

  if (shouldBypassLogin()) {
    const configured = await findConfiguredStore();
    if (configured) return configured;
  }

  if (isDemoNoAuthAllowed()) {
    const existing = await prisma.store.findFirst();
    if (existing) return existing;
    return prisma.store.create({ data: { name: LOCAL_DEMO_STORE_NAME } });
  }

  return getActiveStoreFromSession();
}
