import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, Sticker } from "@/components/ui";
import { PurchaseOrderReceive } from "@/components/PurchaseOrderReceive";
import { prisma } from "@/lib/db";

function statusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "RECEIVED") return <Badge variant="ok">Recibida</Badge>;
  if (s === "PARTIAL") return <Badge variant="soon">Parcial</Badge>;
  if (s === "SENT") return <Badge variant="info">Enviada</Badge>;
  if (s === "CANCELED") return <Badge variant="neutral">Cancelada</Badge>;
  return <Badge variant="neutral">Borrador</Badge>;
}

function waLink(phone: string, text: string) {
  const cleaned = phone.replace(/\D/g, "");
  const to = cleaned.startsWith("598") ? cleaned : `598${cleaned}`;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true, currentStock: true } }
        }
      }
    }
  });

  if (!order) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-semibold text-slate-900">Orden no encontrada</div>
            <div className="mt-2">
              <Link href="/orders">
                <Button variant="outline">Volver</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supplierName = order.supplier?.name ?? "Sin proveedor";
  const totalOrdered = order.items.reduce((a, i) => a + i.qtyOrdered, 0);
  const totalReceived = order.items.reduce((a, i) => a + i.qtyReceived, 0);

  const messageLines = order.items.map((i) => {
    const sku = i.product.sku ? ` (${i.product.sku})` : "";
    return `- ${i.product.name}${sku}: ${i.qtyOrdered} ${i.product.unit}`;
  });

  const waMsg = `Hola ${supplierName}! Te paso un pedido:\n\n${messageLines.join("\n")}\n\nGracias.`;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-600 to-indigo-600" />
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Sticker tone="emerald">📦 OC</Sticker>
                <div className="truncate text-sm font-semibold text-slate-900">{order.title}</div>
                {statusBadge(order.status)}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Proveedor: <span className="font-semibold">{supplierName}</span> · total: {totalReceived}/{totalOrdered}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Creada: {new Date(order.createdAt).toLocaleString()}
                {order.receivedAt ? ` · Recibida: ${new Date(order.receivedAt).toLocaleString()}` : ""}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/orders">
                <Button variant="outline">
                  <span aria-hidden>⬅️</span>
                  Historial
                </Button>
              </Link>
              {order.supplier?.phone ? (
                <a href={waLink(order.supplier.phone, waMsg)} target="_blank" rel="noreferrer">
                  <Button>
                    <span aria-hidden>📨</span>
                    WhatsApp
                  </Button>
                </a>
              ) : (
                <Button disabled title="El proveedor no tiene teléfono">
                  WhatsApp
                </Button>
              )}
            </div>
          </div>

          {order.notes ? <div className="mt-4 text-sm text-slate-600">Notas: {order.notes}</div> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Items</div>
            <div className="text-xs text-slate-500">Pedido vs recibido (y stock actual).</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.items.map((i) => {
                const remaining = Math.max(0, i.qtyOrdered - i.qtyReceived);
                return (
                  <div key={i.id} className="rounded-2xl border border-slate-200/60 bg-white/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{i.product.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          pedido: {i.qtyOrdered} · recibido: {i.qtyReceived} · restante: {remaining} · stock: {i.product.currentStock}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-slate-600">
                        {i.product.sku ? <Badge variant="neutral">SKU {i.product.sku}</Badge> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Recepción</div>
            <div className="text-xs text-slate-500">Recibí parcial y se actualiza el stock automáticamente.</div>
          </CardHeader>
          <CardContent>
            <PurchaseOrderReceive
              orderId={order.id}
              items={order.items.map((i) => ({
                id: i.id,
                productName: i.product.name,
                unit: i.product.unit,
                qtyOrdered: i.qtyOrdered,
                qtyReceived: i.qtyReceived
              }))}
            />

            <div className="mt-4 text-[11px] text-slate-500">
              Cuando recibís, se generan movimientos <span className="font-semibold">IN</span> y sube el stock.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
