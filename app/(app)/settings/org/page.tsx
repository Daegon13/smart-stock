import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OrgPage() {
  const user = await requireUser();
  if (user.userId === "demo-user") return <div className="p-6">Org settings disponible con auth real.</div>;

  const orgs = await prisma.organization.findMany({
    where: { members: { some: { userId: user.userId } } },
    include: { franchises: true, stores: true }
  });

  return <div className="p-6"><h1 className="text-xl font-semibold">Organización</h1><pre>{JSON.stringify(orgs, null, 2)}</pre></div>;
}
