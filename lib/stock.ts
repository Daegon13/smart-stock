export type StockProduct = {
  id: string;
  name: string;
  sku?: string | null;
  unit: string;
  cost: number;
  price: number;

  // Config por producto
  stockMin: number;
  leadTimeDays?: number | null;
  coverageDays?: number | null;
  safetyStock?: number | null;

  currentStock: number;
  supplierId?: string | null;
  supplierName?: string | null;
  supplierPhone?: string | null;
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
  sku?: string | null;
  unit?: string;

  supplierId?: string | null;
  supplierName?: string | null;
  supplierPhone?: string | null;

  currentStock: number;
  stockMin: number;

  leadTimeDays: number;
  coverageDays: number;
  safetyStock: number;

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

  // Defaults (fallback) por si un producto viene sin config
  leadTimeDays?: number;
  coverageDays?: number;
  safetyStock?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function asInt(n: unknown, fallback: number) {
  const v = typeof n === "number" ? n : n === null || n === undefined ? NaN : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.floor(v));
}

export function computeSuggestions(
  products: StockProduct[],
  movements: StockMovement[],
  opts: StockAlgoOptions = {}
): StockSuggestion[] {
  const lookbackDays = asInt(opts.lookbackDays ?? 30, 30);
  const defaultLead = asInt(opts.leadTimeDays ?? 3, 3);
  const defaultCoverage = asInt(opts.coverageDays ?? 14, 14);
  const defaultSafetyStock = asInt(opts.safetyStock ?? 0, 0);

  const now = Date.now();
  const from = now - lookbackDays * 24 * 60 * 60 * 1000;
  const outs = movements.filter((m) => m.type === "OUT" && m.createdAt.getTime() >= from);

  const outByProduct = new Map<string, number>();
  for (const m of outs) {
    outByProduct.set(m.productId, (outByProduct.get(m.productId) ?? 0) + Math.max(0, m.qty));
  }

  return products
    .map((p) => {
      const leadTimeDays = asInt(p.leadTimeDays, defaultLead);
      const coverageDays = asInt(p.coverageDays, defaultCoverage);
      const safetyStock = asInt(p.safetyStock, defaultSafetyStock);

      const outQty = outByProduct.get(p.id) ?? 0;
      const avgDailyOutRaw = outQty / Math.max(1, lookbackDays);

      // Si no hay historial, usamos el stock mínimo como proxy de demanda.
      const usedProxy = avgDailyOutRaw <= 0;
      const demandProxy = p.stockMin > 0 ? p.stockMin / 7 : 0;
      const demand = avgDailyOutRaw > 0 ? avgDailyOutRaw : demandProxy;

      const daysCover = demand > 0 ? p.currentStock / demand : null;

      // Punto de reposición: demanda durante el lead time + colchón
      const reorderPoint = Math.ceil(demand * leadTimeDays + safetyStock);

      // Stock objetivo: cubrir lead time + cobertura deseada, + colchón
      const targetStock = Math.ceil(demand * (leadTimeDays + coverageDays) + safetyStock);

      // Nunca menos que stock mínimo
      const finalTarget = Math.max(targetStock, p.stockMin);

      const suggestedQty = Math.max(0, finalTarget - p.currentStock);

      const severity: StockSuggestion["severity"] =
        p.currentStock <= p.stockMin
          ? "low"
          : daysCover !== null && daysCover <= Math.max(1, leadTimeDays)
          ? "soon"
          : "ok";

      let reason = "";
      if (demand <= 0) {
        reason = "Sin historial suficiente. Configurá stock mínimo o registrá movimientos para mejorar la predicción.";
      } else {
        const coverTxt = daysCover === null ? "" : `Cobertura actual: ~${round2(clamp(daysCover, 0, 999))} días. `;
        const demandTxt = `Consumo/día: ${round2(avgDailyOutRaw > 0 ? avgDailyOutRaw : demand)}${usedProxy ? " (proxy)" : ""}. `;
        const cfgTxt = `Lead time: ${leadTimeDays}d · Cobertura: ${coverageDays}d · Colchón: ${safetyStock}u.`;
        if (severity === "low") {
          reason = `${coverTxt}Está en ${p.currentStock} (mínimo ${p.stockMin}). ${cfgTxt}`;
        } else if (severity === "soon") {
          reason = `${coverTxt}${demandTxt}Sugerencia para llegar a ${finalTarget}u. ${cfgTxt}`;
        } else {
          reason = `${coverTxt}${demandTxt}Stock saludable. ${cfgTxt}`;
        }
      }

      return {
        productId: p.id,
        name: p.name,

        sku: p.sku ?? null,
        unit: p.unit,

        supplierId: p.supplierId ?? null,
        supplierName: p.supplierName ?? null,
        supplierPhone: p.supplierPhone ?? null,

        currentStock: p.currentStock,
        stockMin: p.stockMin,

        leadTimeDays,
        coverageDays,
        safetyStock,

        avgDailyOut: round2(avgDailyOutRaw),
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

function csvEscape(v: string) {
  const needs = /[",\n]/.test(v);
  const s = v.replace(/"/g, '""');
  return needs ? `"${s}"` : s;
}

export function buildPurchaseCsv(items: { sku?: string | null; name: string; qty: number; unit?: string }[]) {
  const rows = items
    .filter((i) => i.qty > 0)
    .map((i) => [i.sku ?? "", i.name, String(i.qty), i.unit ?? ""].map(csvEscape).join(","));
  return ["SKU,Producto,Cantidad,Unidad", ...rows].join("\n");
}

export function normalizeUYPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // ya viene con 598
  if (digits.startsWith("598") && digits.length >= 11) return digits;

  // formato local: 09xxxxxxx (9 dígitos)
  if (digits.length === 9 && digits.startsWith("0")) {
    const rest = digits.slice(1);
    return `598${rest}`;
  }

  // formato local sin 0: 9xxxxxxx (8 dígitos)
  if (digits.length === 8 && digits.startsWith("9")) {
    return `598${digits}`;
  }

  return null;
}

export function buildWhatsAppUrl(message: string, phone?: string | null) {
  const normalized = normalizeUYPhone(phone);
  const text = encodeURIComponent(message);
  if (normalized) return `https://wa.me/${normalized}?text=${text}`;
  return `https://wa.me/?text=${text}`;
}

export function buildSupplierPurchaseMessage(args: {
  supplierName?: string | null;
  storeName?: string | null;
  items: { name: string; qty: number; unit?: string; sku?: string | null }[];
}) {
  const supplier = args.supplierName?.trim() || "";
  const store = args.storeName?.trim() || "";

  const lines = args.items
    .filter((i) => i.qty > 0)
    .map((i) => `- ${i.name}: ${i.qty}${i.unit ? ` ${i.unit}` : ""}`);

  if (lines.length === 0) return "Por ahora no hay nada urgente para pedir.";

  const hello = supplier ? `Hola ${supplier}!` : "Hola!";
  const from = store ? `\nSoy de ${store}.` : "";

  return `${hello}${from}\nTe paso el pedido:\n\n${lines.join("\n")}\n\nGracias.`;
}
