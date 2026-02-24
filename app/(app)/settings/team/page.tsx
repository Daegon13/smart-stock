import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await requireUser();
  if (user.userId === "demo-user") return <div className="p-6">Team settings disponible con auth real.</div>;

  const memberships = await prisma.orgMember.findMany({ where: { userId: user.userId }, include: { organization: true } });

  return <div className="p-6"><h1 className="text-xl font-semibold">Miembros</h1><pre>{JSON.stringify(memberships, null, 2)}</pre></div>;
}
