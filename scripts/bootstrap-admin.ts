import { prisma } from "../lib/db";
import { hashPassword } from "../lib/auth";

const DEFAULT_ORG_NAME = "Default Org";
const DEFAULT_ORG_SLUG = "default-org";
const DEFAULT_FRANCHISE_NAME = "Default Franchise";
const OWNER_ROLE = "OWNER";

function requireEnv(name: string) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  const email = requireEnv("AUTH_BOOTSTRAP_EMAIL").toLowerCase();
  const password = requireEnv("AUTH_BOOTSTRAP_PASSWORD");
  const name = (process.env.AUTH_BOOTSTRAP_NAME || "Admin").trim() || "Admin";

  const passwordHash = hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash }
  });

  const organization = await prisma.organization.upsert({
    where: { slug: DEFAULT_ORG_SLUG },
    update: { name: DEFAULT_ORG_NAME },
    create: { name: DEFAULT_ORG_NAME, slug: DEFAULT_ORG_SLUG }
  });

  const existingFranchise = await prisma.franchise.findFirst({
    where: {
      organizationId: organization.id,
      name: DEFAULT_FRANCHISE_NAME
    }
  });

  const franchise =
    existingFranchise ||
    (await prisma.franchise.create({
      data: {
        organizationId: organization.id,
        name: DEFAULT_FRANCHISE_NAME
      }
    }));

  await prisma.store.updateMany({
    where: { organizationId: null },
    data: { organizationId: organization.id }
  });

  await prisma.store.updateMany({
    where: { franchiseId: null },
    data: { franchiseId: franchise.id }
  });

  await prisma.orgMember.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id
      }
    },
    update: { role: OWNER_ROLE },
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: OWNER_ROLE
    }
  });

  const orgStores = await prisma.store.findMany({
    where: { organizationId: organization.id },
    select: { id: true }
  });

  for (const store of orgStores) {
    await prisma.storeMember.upsert({
      where: {
        userId_storeId: {
          userId: user.id,
          storeId: store.id
        }
      },
      update: { role: OWNER_ROLE },
      create: {
        userId: user.id,
        storeId: store.id,
        role: OWNER_ROLE
      }
    });
  }

  console.log(`✅ Admin bootstrap listo: ${email}`);
}

main()
  .catch((error) => {
    console.error("❌ Error en bootstrap admin", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
