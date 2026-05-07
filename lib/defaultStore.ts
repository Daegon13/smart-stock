import { getActiveStoreFromSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDefaultShowcaseStoreId, isDemoNoAuthAllowed, isShowcaseMode, shouldBypassLogin } from "@/lib/runtimeFlags";

const SHOWCASE_STORE_NAME = "Minimarket Demo";
const LOCAL_DEMO_STORE_NAME = "Demo Store";

function canCreateLocalDemoStore() {
  return process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1";
}

async function findConfiguredStore() {
  const configuredStoreId = getDefaultShowcaseStoreId();
  if (!configuredStoreId) return null;
  return prisma.store.findUnique({ where: { id: configuredStoreId } });
}

async function findStableDemoStore() {
  const configured = await findConfiguredStore();
  if (configured) return configured;

  const namedDemo = await prisma.store.findFirst({
    where: { name: SHOWCASE_STORE_NAME },
    orderBy: { createdAt: "asc" }
  });
  if (namedDemo) return namedDemo;

  return prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function getOrCreateDefaultStore() {
  if (isShowcaseMode()) {
    const demo = await findStableDemoStore();
    if (demo) return demo;

    if (canCreateLocalDemoStore()) {
      return prisma.store.create({ data: { name: LOCAL_DEMO_STORE_NAME } });
    }

    throw new Error(
      "SHOWCASE_MODE=true requiere una tienda demo existente. Configurá DEMO_STORE_ID/SHOWCASE_STORE_ID o ejecutá el seed de showcase."
    );
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
