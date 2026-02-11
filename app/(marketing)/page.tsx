import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Stock Inteligente (MVP)
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Control de inventario + sugerencia de compras. Hecho para minimarkets y autoservicios que hoy
          sobreviven con Excel y WhatsApp.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/dashboard">
            <Button>Entrar al panel</Button>
          </Link>
          <a href="#que-hace">
            <Button variant="ghost">Ver qué hace</Button>
          </a>
        </div>
      </div>

      <section id="que-hace" className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <div className="text-sm font-semibold text-slate-900">Stock confiable</div>
            <p className="mt-2 text-sm text-slate-600">
              Entradas/salidas y stock mínimo. Historial de movimientos para entender errores.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-sm font-semibold text-slate-900">Compras sugeridas</div>
            <p className="mt-2 text-sm text-slate-600">
              Lista de compra basada en consumo reciente + margen de seguridad (primera versión).
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-sm font-semibold text-slate-900">Asistente IA</div>
            <p className="mt-2 text-sm text-slate-600">
              Preguntás en español y te responde con tus datos (con fallback si no hay API key).
            </p>
          </CardContent>
        </Card>
      </section>

      <div className="mt-10 text-xs text-slate-500">
        Nota: esto es un starter técnico para que lo expandamos rápido.
      </div>
    </main>
  );
}
