import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { selectStoreAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SelectStorePage() {
  const user = await requireUser();
  const stores = user.userId === "demo-user"
    ? await prisma.store.findMany({ orderBy: { name: "asc" } })
    : await prisma.store.findMany({
        where: {
          OR: [
            { memberships: { some: { userId: user.userId } } },
            { organization: { members: { some: { userId: user.userId } } } }
          ]
        },
        orderBy: { name: "asc" }
      });

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar local activo</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={selectStoreAction} className="space-y-3">
            {stores.map((store) => (
              <label key={store.id} className="flex items-center gap-2 rounded border p-3">
                <input type="radio" name="storeId" value={store.id} required />
                <span>{store.name}</span>
              </label>
            ))}
            <Button type="submit">Usar local</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
