import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, Sticker } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultStore } from "@/lib/defaultStore";

function statusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "RECEIVED") return <Badge variant="ok">Recibida</Badge>;
  if (s === "PARTIAL") return <Badge variant="soon">Parcial</Badge>;
  if (s === "SENT") return <Badge variant="info">Enviada</Badge>;
  if (s === "CANCELED") return <Badge variant="neutral">Cancelada</Badge>;
  return <Badge variant="neutral">Borrador</Badge>;
}

export default async function OrdersPage() {
  const store = await getOrCreateDefaultStore();

  const orders = await prisma.purchaseOrder.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      supplier: { select: { id: true, name: true } },
      items: { select: { qtyOrdered: true, qtyReceived: true } }
    }
  });

  return (
    <div className="space-y-6" data-tour="orders">
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-600 to-indigo-600" />
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sticker tone="emerald">📦</Sticker>
                <div className="text-sm font-semibold text-slate-900">Pedidos</div>
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Armá el pedido por proveedor y enviá por WhatsApp.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/stock">
                <Button>
                  <span aria-hidden>🧠</span>
                  Crear desde Reposición
                </Button>
              </Link>
              <Link href="/today">
                <Button variant="outline">
                  <span aria-hidden>✅</span>
                  Volver a Hoy
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-sm font-semibold text-slate-900">Historial</div>
          <div className="text-xs text-slate-500">Últimos 50 pedidos.</div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="space-y-2 text-sm text-slate-600">
              <div>Todavía no hay pedidos.</div>
              <div>Para empezar: andá a Reposición y creá el primer pedido.</div>
              <Link href="/stock" className="inline-block"><Button>Ir a Reposición</Button></Link>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => {
                const totalOrdered = o.items.reduce((a, i) => a + i.qtyOrdered, 0);
                const totalReceived = o.items.reduce((a, i) => a + i.qtyReceived, 0);
                const supplier = o.supplier?.name ?? "Sin proveedor";
                return (
                  <Link key={o.id} href={`/orders/${o.id}`} className="block">
                    <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-3 transition hover:bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-semibold text-slate-900">{o.title}</div>
                            <Badge variant="info">🏭 {supplier}</Badge>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {new Date(o.createdAt).toLocaleString()} · items: {o.items.length} · total: {totalReceived}/{totalOrdered}
                          </div>
                        </div>
                        <div className="shrink-0">{statusBadge(o.status)}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
