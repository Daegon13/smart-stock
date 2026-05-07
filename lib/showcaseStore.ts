import { prisma } from "@/lib/db";
import { getDefaultShowcaseStoreId } from "@/lib/runtimeFlags";

export const SHOWCASE_STORE_NAME = "Minimarket Demo";
export const LOCAL_DEMO_STORE_NAME = "Demo Store";
export const SHOWCASE_STORE_REQUIRED_ERROR =
  "SHOWCASE_MODE=true requiere una tienda demo existente. Configurá DEMO_STORE_ID/SHOWCASE_STORE_ID o ejecutá el seed de showcase.";

function canUseLocalFallbackStore() {
  return process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1";
}

async function findConfiguredShowcaseStore() {
  const configuredStoreId = getDefaultShowcaseStoreId();
  if (!configuredStoreId) return null;
  return prisma.store.findUnique({ where: { id: configuredStoreId } });
}

export async function findShowcaseStore({
  allowLocalFallback = false,
  allowLocalCreate = false,
}: {
  allowLocalFallback?: boolean;
  allowLocalCreate?: boolean;
} = {}) {
  const configured = await findConfiguredShowcaseStore();
  if (configured) return configured;

  const namedDemo = await prisma.store.findFirst({
    where: { name: SHOWCASE_STORE_NAME },
    orderBy: { createdAt: "asc" },
  });
  if (namedDemo) return namedDemo;

  if (allowLocalFallback && canUseLocalFallbackStore()) {
    const localStore = await prisma.store.findFirst({
      orderBy: { createdAt: "asc" },
    });
    if (localStore) return localStore;
  }

  if (allowLocalCreate && canUseLocalFallbackStore()) {
    return prisma.store.create({ data: { name: LOCAL_DEMO_STORE_NAME } });
  }

  return null;
}
