export type StockProduct = {
  id: string;
  name: string;
  unit: string;
  cost: number;
  price: number;
  stockMin: number;
  currentStock: number;
  supplierId?: string | null;
  category?: string | null;
};

export type StockMovement = {
  productId: string;
  type: "IN" | "OUT" | "ADJUST";
  qty: number;
  createdAt: Date;
};

export type StockSuggestion = {
  productId: string;
  name: string;
  currentStock: number;
  stockMin: number;
  avgDailyOut: number;
  daysCover: number | null;
  reorderPoint: number;
  targetStock: number;
  suggestedQty: number;
  severity: "ok" | "soon" | "low";
  reason: string;
};

export type StockAlgoOptions = {
  lookbackDays?: number;
  leadTimeDays?: number;
  safetyDays?: number;
  reviewDays?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeSuggestions(
  products: StockProduct[],
  movements: StockMovement[],
  opts: StockAlgoOptions = {}
): StockSuggestion[] {
  const lookbackDays = opts.lookbackDays ?? 30;
  const leadTimeDays = opts.leadTimeDays ?? 3;
  const safetyDays = opts.safetyDays ?? 4;
  const reviewDays = opts.reviewDays ?? 7;

  const now = Date.now();
  const from = now - lookbackDays * 24 * 60 * 60 * 1000;
  const outs = movements.filter((m) => m.type === "OUT" && m.createdAt.getTime() >= from);

  const outByProduct = new Map<string, number>();
  for (const m of outs) {
    outByProduct.set(m.productId, (outByProduct.get(m.productId) ?? 0) + Math.max(0, m.qty));
  }

  return products
    .map((p) => {
      const outQty = outByProduct.get(p.id) ?? 0;
      const avgDailyOut = outQty / lookbackDays;

      // Si no hay historial, usamos el stock mínimo como proxy de demanda.
      const demandProxy = p.stockMin > 0 ? p.stockMin / 7 : 0;
      const demand = avgDailyOut > 0 ? avgDailyOut : demandProxy;

      const daysCover = demand > 0 ? p.currentStock / demand : null;

      // Punto de reposición: demanda durante lead time + colchón
      const reorderPoint = Math.ceil(demand * (leadTimeDays + safetyDays));

      // Stock objetivo: cubrir hasta la próxima revisión
      const targetStock = Math.ceil(demand * (leadTimeDays + safetyDays + reviewDays));

      // Nunca menos que stock mínimo (y un poquito más si está todo en cero)
      const floorTarget = p.stockMin > 0 ? p.stockMin : 0;
      const finalTarget = Math.max(targetStock, floorTarget);

      const suggestedQty = Math.max(0, finalTarget - p.currentStock);

      const severity: StockSuggestion["severity"] =
        p.currentStock <= p.stockMin ? "low" : daysCover !== null && daysCover <= (leadTimeDays + safetyDays) ? "soon" : "ok";

      let reason = "";
      if (severity === "low") {
        reason = `Está en ${p.currentStock} (mínimo ${p.stockMin}).`;
      } else if (severity === "soon") {
        reason = `Cobertura estimada: ~${round2(clamp(daysCover ?? 0, 0, 999))} días.`;
      } else {
        reason = "Stock saludable.";
      }

      return {
        productId: p.id,
        name: p.name,
        currentStock: p.currentStock,
        stockMin: p.stockMin,
        avgDailyOut: round2(avgDailyOut),
        daysCover: daysCover === null ? null : round2(daysCover),
        reorderPoint,
        targetStock: finalTarget,
        suggestedQty,
        severity,
        reason
      } satisfies StockSuggestion;
    })
    .sort((a, b) => {
      const prio = (s: StockSuggestion["severity"]) => (s === "low" ? 0 : s === "soon" ? 1 : 2);
      const d = prio(a.severity) - prio(b.severity);
      if (d !== 0) return d;
      return b.suggestedQty - a.suggestedQty;
    });
}

export function buildPurchaseMessage(items: { name: string; qty: number; unit?: string }[]) {
  const lines = items
    .filter((i) => i.qty > 0)
    .map((i) => `- ${i.name}: ${i.qty}${i.unit ? ` ${i.unit}` : ""}`);
  if (lines.length === 0) return "Por ahora no hay nada urgente para pedir.";
  return `Hola! Te paso el pedido:\n\n${lines.join("\n")}\n\nGracias.`;
}
