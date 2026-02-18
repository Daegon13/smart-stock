import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, Sticker } from "@/components/ui";
import { DemoSeedButton } from "@/components/DemoSeedButton";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { computeSuggestions } from "@/lib/stock";

function sevBadge(sev: "ok" | "soon" | "low") {
  if (sev === "low") return <Badge variant="low">Crítico</Badge>;
  if (sev === "soon") return <Badge variant="soon">Reponer</Badge>;
  return <Badge variant="ok">OK</Badge>;
}

function pct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 100)));
}

function CoverageBar({
  severity,
  ratio
}: {
  severity: "ok" | "soon" | "low";
  ratio: number; // 0..1
}) {
  const p = pct(ratio);
  const tone =
    severity === "low"
      ? "from-red-500 to-amber-500"
      : severity === "soon"
      ? "from-amber-500 to-orange-500"
      : "from-emerald-500 to-lime-500";

  return (
    <div className="mt-2">
      <div className="h-2 w-full rounded-full bg-slate-200/80">
        <div className={`h-2 rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${p}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-slate-500">cobertura: {p}%</div>
    </div>
  );
}

export default async function TodayPage() {
  const store = await getOrCreateDefaultStore();

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      cost: true,
      price: true,
      stockMin: true,
      leadTimeDays: true,
      coverageDays: true,
      safetyStock: true,
      currentStock: true,
      supplierId: true,
      supplier: { select: { name: true, phone: true } }
    }
  });

  const movements = await prisma.inventoryMovement.findMany({
    where: { storeId: store.id },
    select: { productId: true, type: true, qty: true, createdAt: true }
  });

  const mapped = products.map(({ supplier, ...p }) => ({
    ...p,
    supplierName: supplier?.name ?? null,
    supplierPhone: supplier?.phone ?? null
  }));

  const suggestions = computeSuggestions(mapped as any, movements as any, { lookbackDays: 30 });
  const urgent = suggestions.filter((s) => s.severity !== "ok" && s.suggestedQty > 0);

  const criticalCount = urgent.filter((s) => s.severity === "low").length;
  const soonCount = urgent.filter((s) => s.severity === "soon").length;

  const top = urgent.slice(0, 8);

  // agrupación por proveedor (para que el usuario “vea” el pedido real)
  const bySupplier = new Map<string, { supplierName: string; items: number }>();
  for (const s of urgent) {
    const key = s.supplierId ?? "__none__";
    const name = (s.supplierName?.trim() ? s.supplierName : "Sin proveedor") as string;
    const prev = bySupplier.get(key) ?? { supplierName: name, items: 0 };
    prev.items += 1;
    bySupplier.set(key, prev);
  }
  const supplierGroups = Array.from(bySupplier.values()).sort((a, b) => b.items - a.items).slice(0, 4);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600" />
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Sticker tone="amber">✅ Qué hacer hoy</Sticker>
                <div className="text-sm font-semibold text-slate-900">{store.name}</div>
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Pantalla pensada para minimarket: 3 acciones rápidas + lo urgente ordenado.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/stock">
                <Button variant="outline">
                  <span aria-hidden>🧠</span>
                  Ver stock inteligente
                </Button>
              </Link>
              <Link href={`/assistant?q=${encodeURIComponent("¿Qué debería comprar hoy? Dame una lista corta y por proveedor.")}`}>
                <Button>
                  <Sticker tone="pink">✨ IA</Sticker>
                  Preguntar
                </Button>
              </Link>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200/60 bg-white/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Sin datos aún</div>
                  <div className="mt-1 text-sm text-slate-600">Cargá datos demo para ver el impacto en 1 clic.</div>
                </div>
                <DemoSeedButton />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-amber-500" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Reponer hoy</div>
                <div className="text-xs text-slate-500">Lo crítico + lo que te deja sin stock.</div>
              </div>
              <Sticker tone="amber">⚠️</Sticker>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{criticalCount}</div>
            <div className="mt-1 text-sm text-slate-600">críticos · {soonCount} por reponer</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/stock">
                <Button>
                  <span aria-hidden>🛒</span>
                  Armar pedido
                </Button>
              </Link>
              <Link href="/products">
                <Button variant="outline">
                  <span aria-hidden>🏷️</span>
                  Ajustar mínimos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 to-sky-500" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Ventas del día</div>
                <div className="text-xs text-slate-500">Que el stock “se mueva” sin planillas.</div>
              </div>
              <Sticker tone="indigo">🧾</Sticker>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600">Registrá una salida o importá ventas.</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/movements?type=OUT">
                <Button>
                  <span aria-hidden>⚡</span>
                  Venta rápida
                </Button>
              </Link>
              <Link href="/import">
                <Button variant="outline">
                  <span aria-hidden>⬆️</span>
                  Importar
                </Button>
              </Link>
            </div>
            <div className="mt-3 text-[11px] text-slate-500">
              Próximo paso (plan): importar tickets/ventas desde POS.
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-600 to-pink-600" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">IA accionable</div>
                <div className="text-xs text-slate-500">No texto genérico: usa tus datos.</div>
              </div>
              <Sticker tone="pink">✨</Sticker>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600">Pedile un plan corto para hoy.</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/assistant?q=${encodeURIComponent(
                  "Dame 3 acciones para hoy en un minimarket basadas en mi stock y mis movimientos (corto y directo)."
                )}`}
              >
                <Button>
                  <span aria-hidden>🤖</span>
                  Plan del día
                </Button>
              </Link>
              <Link
                href={`/assistant?q=${encodeURIComponent(
                  "Armame un mensaje corto para WhatsApp para pedir lo urgente al proveedor (por proveedor)."
                )}`}
              >
                <Button variant="outline">
                  <span aria-hidden>📨</span>
                  Mensaje proveedor
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Lo urgente (ordenado)</div>
                <div className="text-xs text-slate-500">Top 8 por riesgo y cantidad sugerida.</div>
              </div>
              {urgent.length > 0 ? <Badge variant="low">Prioridad</Badge> : <Badge variant="ok">OK</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {urgent.length === 0 ? (
              <div className="text-sm text-slate-600">Por ahora no hay nada urgente.</div>
            ) : (
              <div className="space-y-2">
                {top.map((u) => {
                  const denom = Math.max(1, u.leadTimeDays + u.coverageDays);
                  const ratio = u.daysCover === null ? 0 : Math.max(0, Math.min(1, u.daysCover / denom));
                  return (
                    <div
                      key={u.productId}
                      className={
                        "rounded-2xl border border-slate-200/60 bg-white/70 px-3 py-2 " +
                        (u.severity === "low" ? "border-l-4 border-l-red-500" : "border-l-4 border-l-amber-500")
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-semibold text-slate-900">{u.name}</div>
                            {u.supplierName ? <Badge variant="info">🏭 {u.supplierName}</Badge> : null}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            stock: <span className={u.severity === "low" ? "text-red-600" : "text-slate-700"}>{u.currentStock}</span> ·
                            min: {u.stockMin}
                            {u.daysCover !== null ? ` · cobertura: ~${u.daysCover}d` : " · sin cobertura"}
                          </div>
                          <CoverageBar severity={u.severity} ratio={ratio} />
                        </div>

                        <div className="w-28 text-right">
                          {sevBadge(u.severity)}
                          <div className="mt-1 text-xs text-slate-600">
                            sugerido: <span className="font-semibold">{u.suggestedQty}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/stock">
                <Button variant="outline">
                  <span aria-hidden>🧠</span>
                  Abrir lista completa
                </Button>
              </Link>
              <Link href="/movements?type=OUT">
                <Button variant="outline">
                  <span aria-hidden>⚡</span>
                  Registrar venta
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="text-sm font-semibold text-slate-900">Pedidos por proveedor</div>
            <div className="text-xs text-slate-500">Para que el dueño vea “esto ya está listo”.</div>
          </CardHeader>
          <CardContent>
            {urgent.length === 0 ? (
              <div className="text-sm text-slate-600">Nada para pedir por ahora.</div>
            ) : (
              <div className="space-y-2">
                {supplierGroups.map((g) => (
                  <div key={g.supplierName} className="rounded-2xl border border-slate-200/60 bg-white/70 p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{g.supplierName}</div>
                        <div className="text-xs text-slate-500">items urgentes: {g.items}</div>
                      </div>
                      <Sticker tone="emerald">🛒</Sticker>
                    </div>
                    <div className="mt-3">
                      <Link href="/stock">
                        <Button className="w-full" variant="soft">
                          Abrir y generar WhatsApp
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 text-[11px] text-slate-500">
              Tip demo: entrá a <span className="font-semibold">Stock inteligente</span>, seleccioná urgentes y apretá
              WhatsApp.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
