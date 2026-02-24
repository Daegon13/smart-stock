import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const user = await requireUser();
  const sessions = user.userId === "demo-user" ? [] : await prisma.session.findMany({ where: { userId: user.userId }, orderBy: { expires: "desc" } });

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Sesiones activas</h1>
      <ul className="space-y-2">
        {sessions.map((s) => <li key={s.id} className="rounded border p-3">{s.sessionToken.slice(0, 8)}… expira {new Date(s.expires).toLocaleString()}</li>)}
      </ul>
    </div>
  );
}
