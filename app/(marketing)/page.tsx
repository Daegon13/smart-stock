import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, Sticker } from "@/components/ui";
import { PUBLIC_CONTACT_URL } from "@/lib/clientShowcase";

const technicalSignals = [
  "Next.js App Router con rutas públicas y panel server-rendered",
  "Prisma + PostgreSQL con modelo preparado para organización, franquicia y local",
  "Importación CSV/XLSX y conciliación de ventas no reconocidas",
  "Cálculo de reposición, stock crítico y pedidos por proveedor",
  "Showcase público read-only protegido por flags de runtime",
  "Camino limpio para retomar auth real, multi-tenant y SaaS"
];

const modules = [
  {
    title: "Stock y urgencias",
    description: "Detecta faltantes, mínimos críticos y próximos productos a reponer para operar el día sin planillas."
  },
  {
    title: "Ventas importadas",
    description: "Permite cargar movimientos desde CSV/XLSX y deja trazabilidad para revisar qué se pudo conciliar."
  },
  {
    title: "Pedidos por proveedor",
    description: "Agrupa sugerencias de compra para convertir decisiones de reposición en pedidos accionables."
  }
];

export default function HomePage() {
  return (
    <main className="bg-slate-50">
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.15fr_0.85fr] md:py-16">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Sticker tone="purple">Smart Stock</Sticker>
            <Badge tone="amber">Demo pública</Badge>
            <Badge variant="neutral">Datos ficticios</Badge>
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            Inventario, reposición y pedidos para comercios que todavía viven en planillas.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Smart Stock muestra cómo una pyme puede importar ventas, detectar stock crítico y armar pedidos por proveedor sin perder horas revisando Excel, chats y anotaciones sueltas.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/today">Entrar a la demo</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/about-demo">Ver recorrido técnico</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a href={PUBLIC_CONTACT_URL}>Contactar por una implementación</a>
            </Button>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Estado actual:</strong> showcase navegable en modo solo lectura, con datos ficticios para muestra técnica. La auth real, multi-tenant completo y operación SaaS quedan preservadas como camino futuro.
          </div>
        </div>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-amber-500" />
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Qué resuelve</div>
                <div className="text-xs text-slate-500">Del dato operativo a la acción diaria.</div>
              </div>
              <Sticker tone="amber">⚡</Sticker>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {modules.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent>
              <Sticker tone="indigo">1</Sticker>
              <div className="mt-3 text-sm font-semibold text-slate-900">Importás ventas</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">La demo contempla cargas CSV/XLSX, movimientos y conciliación de productos no reconocidos.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Sticker tone="rose">2</Sticker>
              <div className="mt-3 text-sm font-semibold text-slate-900">Priorizás faltantes</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">El panel ordena urgencias, mínimos y sugerencias de reposición para decidir qué comprar primero.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Sticker tone="green">3</Sticker>
              <div className="mt-3 text-sm font-semibold text-slate-900">Armás pedidos</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">Las sugerencias se agrupan por proveedor para pasar de alerta a pedido operativo.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Badge variant="info">Portfolio técnico</Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Qué demuestra esta demo técnicamente</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              No se presenta como SaaS terminado: es una pieza pública para evaluar criterio de producto, arquitectura incremental y ejecución full-stack pragmática.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {technicalSignals.map((signal) => (
              <div key={signal} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {signal}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <Card className="bg-slate-950 text-white">
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Lista para explorar</div>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
                  Entrá al panel, recorré stock, importación, reposición y pedidos. Las acciones de escritura están desactivadas para mantener limpia la demo pública.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <Link href="/today">Ver panel</Link>
                </Button>
                <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                  <Link href="/about-demo">Detalles técnicos</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
