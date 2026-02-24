import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, Sticker } from "@/components/ui";
import { DemoSeedButton } from "@/components/DemoSeedButton";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { isDemoAllowed } from "@/lib/demoGate";
import { computeSuggestions } from "@/lib/stock";

type Step = {
  title: string;
  hint: string;
  eta: string;
  href: string;
  missing: number;
};

export default async function TodayPage() {
  const store = await getOrCreateDefaultStore();

  const [productCount, unmatchedCount, orderCount] = await Promise.all([
    prisma.product.count({ where: { storeId: store.id } }),
    prisma.ticketLine.count({ where: { productId: null, ticket: { storeId: store.id } } }),
    prisma.purchaseOrder.count({ where: { storeId: store.id } })
  ]);

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    select: { id: true, name: true, currentStock: true, stockMin: true, supplierId: true }
  });
  const movements = await prisma.inventoryMovement.findMany({
    where: { storeId: store.id },
    select: { productId: true, type: true, qty: true, createdAt: true }
  });
  const suggestions = computeSuggestions(products as any, movements as any);
  const urgentCount = suggestions.filter((s) => s.severity !== "ok" && s.suggestedQty > 0).length;

  const steps: Step[] = [
    { title: "Paso 1: Importar ventas", hint: "Subí un archivo de ventas", eta: "2 min", href: "/import", missing: productCount > 0 ? 0 : 1 },
    { title: "Paso 2: Arreglar no reconocidos", hint: "Resolvé productos que faltan", eta: "3 min", href: "/reconcile", missing: unmatchedCount },
    { title: "Paso 3: Armar pedido", hint: "Creá tu pedido para proveedor", eta: "2-5 min", href: "/stock", missing: urgentCount }
  ];

  const demoAllowed = isDemoAllowed();

  return (
    <div className="space-y-6" data-tour="dashboard">
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600" />
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sticker tone="amber">✅ Hoy</Sticker>
                <div className="text-sm font-semibold text-slate-900">{store.name}</div>
              </div>
              <div className="mt-1 text-sm text-slate-600">Seguí estos 3 pasos y llegás al pedido listo para enviar.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {demoAllowed ? <DemoSeedButton label="Ver ejemplo en 1 minuto" /> : <Link href="/import"><Button>Ver guía rápida</Button></Link>}
              <Link href="/orders"><Button variant="outline">Ir a pedidos</Button></Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step) => {
          const done = step.missing === 0;
          return (
            <Card key={step.title}>
              <CardHeader>
                <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                <div className="text-xs text-slate-500">Tiempo estimado: {step.eta}</div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{step.hint}</p>
                <p className="mt-2 text-sm text-slate-700">Te falta <span className="font-semibold">{step.missing}</span></p>
                <div className="mt-2">{done ? <Badge variant="ok">Listo</Badge> : <Badge variant="soon">Pendiente</Badge>}</div>
                <Link href={step.href} className="mt-3 inline-block"><Button className="w-full">Abrir</Button></Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {orderCount === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-slate-900">Todavía no hay pedidos</p>
            <p className="mt-1 text-sm text-slate-600">Para empezar: abrí Reposición y creá el primer pedido por proveedor.</p>
            <Link href="/stock" className="mt-3 inline-block"><Button>Ir a Reposición</Button></Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
