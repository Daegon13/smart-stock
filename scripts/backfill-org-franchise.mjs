import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "default-org" },
    update: {},
    create: { name: "Default Org", slug: "default-org" }
  });

  const franchise = await prisma.franchise.findFirst({ where: { organizationId: org.id, name: "Default Franchise" } })
    ?? await prisma.franchise.create({ data: { organizationId: org.id, name: "Default Franchise" } });

  const updated = await prisma.store.updateMany({
    where: { OR: [{ organizationId: null }, { franchiseId: null }] },
    data: { organizationId: org.id, franchiseId: franchise.id }
  });

  console.log(`Backfill completo. Stores actualizados: ${updated.count}`);
}

main().finally(async () => prisma.$disconnect());
