import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Reposición simple para tu negocio</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Menos planillas, más decisiones claras para comprar a tiempo.</p>
        <ul className="mt-4 space-y-2 text-slate-700">
          <li>• Importás ventas y el stock se actualiza solo.</li>
          <li>• Te muestra lo urgente para reponer hoy.</li>
          <li>• Te arma el pedido por proveedor listo para WhatsApp.</li>
        </ul>
        <div className="mt-6 flex gap-3">
          <Link href="/today"><Button>Probar ahora</Button></Link>
          <Link href="/today"><Button variant="ghost">Ver ejemplo</Button></Link>
        </div>
      </div>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Cómo se usa (3 pasos)</h2>
      </section>

      <section id="que-hace" className="grid gap-4 md:grid-cols-3">
        <Card><CardContent><div className="text-sm font-semibold text-slate-900">1) Importar ventas</div><p className="mt-2 text-sm text-slate-600">Subís CSV/Excel y empezás en minutos.</p></CardContent></Card>
        <Card><CardContent><div className="text-sm font-semibold text-slate-900">2) Revisar urgencias</div><p className="mt-2 text-sm text-slate-600">Ves qué reponer primero y cuánto pedir.</p></CardContent></Card>
        <Card><CardContent><div className="text-sm font-semibold text-slate-900">3) Enviar pedido</div><p className="mt-2 text-sm text-slate-600">Generás pedido por proveedor y lo copiás para WhatsApp.</p></CardContent></Card>
      </section>
    </main>
  );
}
