import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Button, Card, CardContent, CardHeader, Sticker } from "@/components/ui";

export const metadata: Metadata = {
  title: "Recorrido técnico | Smart Stock",
  description: "Stack, alcance actual y camino futuro de Smart Stock como demo pública de portfolio técnico."
};

const stack = ["Next.js 14", "App Router", "React", "TypeScript", "Prisma", "PostgreSQL", "Tailwind CSS", "Vercel"];

const modules = [
  "Panel diario con próximos pasos operativos",
  "Catálogo de productos, proveedores y categorías",
  "Movimientos de inventario y stock crítico",
  "Importación CSV/XLSX y tickets POS",
  "Conciliación de productos no reconocidos",
  "Reposición sugerida y pedidos por proveedor",
  "Asistente IA opcional aislado por configuración",
  "Modo showcase read-only protegido en UI y API"
];

const futurePath = [
  "Reactivar AUTH_LOGIN_ENABLED=true y desactivar SHOWCASE_MODE.",
  "Completar bootstrap owner y sesiones reales para clientes.",
  "Cerrar aislamiento multi-tenant por organización, franquicia y local en todas las APIs.",
  "Endurecer RBAC server-side, auditoría y flujos de recuperación antes de venderlo como SaaS."
];

export default function AboutDemoPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Sticker tone="purple">Recorrido técnico</Sticker>
            <Badge tone="amber">Showcase</Badge>
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Smart Stock como muestra pública: producto entendible, arquitectura preparada y alcance honesto.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            Esta página resume qué se puede evaluar en la demo: la solución de negocio, los módulos implementados, el stack usado y el camino técnico para convertir el showcase en beta privada o SaaS multi-tenant.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/today">Entrar a la demo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Volver a landing</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Problema</div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-600">Comercios chicos pierden margen por faltantes, compras tarde y ventas que no se reflejan rápido en el stock.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Solución demo</div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-600">Un panel que importa ventas, muestra urgencias de reposición y ayuda a armar pedidos por proveedor.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Estado</div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-600">Demo pública read-only con datos ficticios. Auth real y multi-tenant quedan como siguiente etapa controlada.</p>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Stack usado</div>
            <div className="text-xs text-slate-500">Liviano y estándar para deploy en Vercel.</div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stack.map((item) => (
                <Badge key={item} variant="neutral">{item}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Módulos navegables</div>
            <div className="text-xs text-slate-500">Pensados para mostrar valor sin login.</div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {modules.map((item) => (
                <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Decisiones técnicas visibles</div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-6 text-slate-600">
              <li>• Modo showcase separado por flags para no borrar el trabajo de auth real.</li>
              <li>• Seed idempotente para mantener datos consistentes en preview público.</li>
              <li>• Mutaciones bloqueadas cuando la demo corre en modo read-only.</li>
              <li>• Modelo de datos preparado para crecer hacia organizaciones, franquicias y locales.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Camino futuro SaaS</div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm leading-6 text-slate-600">
              {futurePath.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-8 bg-slate-950 text-white">
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold">¿Querés una implementación similar?</div>
              <p className="mt-1 text-sm leading-6 text-slate-300">La demo está orientada a mostrar criterio de producto, ejecución full-stack y una base clara para adaptar a procesos reales.</p>
            </div>
            <Button asChild>
              <a href="mailto:contacto@marindev.com?subject=Implementaci%C3%B3n%20Smart%20Stock">Contactar por una implementación</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
