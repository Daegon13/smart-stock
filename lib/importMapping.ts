export type MappingKey = "sku" | "name" | "stock" | "cost" | "price" | "supplier" | "category";

export type Mapping = Record<MappingKey, string | "">;

function norm(s: string) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumberLoose(raw: unknown): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  // 1.234,56 and 1,234.56
  const cleaned = s
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function uniquenessRatio(values: string[]) {
  const v = values.filter((x) => String(x ?? "").trim() !== "");
  if (v.length === 0) return 0;
  const set = new Set(v.map((x) => String(x).trim().toLowerCase()));
  return set.size / v.length;
}

function looksLikeSku(v: string) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  if (s.length > 24) return false;
  if (/^\d{8,14}$/.test(s)) return true; // barcodes
  if (/^[A-Z0-9-_.]{3,24}$/i.test(s) && !/\s/.test(s)) return true; // short codes
  return false;
}

function looksLikeName(v: string) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  if (s.length < 3) return false;
  if (s.split(/\s+/).length >= 2) return true;
  return /[a-z]/i.test(s) && s.length >= 6;
}

function scoreNumeric(values: string[]) {
  const v = values.slice(0, 40);
  let ok = 0;
  let total = 0;
  const nums: number[] = [];
  for (const x of v) {
    const t = String(x ?? "").trim();
    if (!t) continue;
    total++;
    const n = parseNumberLoose(t);
    if (n === null) continue;
    ok++;
    nums.push(n);
  }
  const ratio = total === 0 ? 0 : ok / total;
  const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  return { ratio, avg };
}

function headerHint(headersNorm: string[], headersRaw: string[], cands: string[]) {
  const idx = headersNorm.findIndex((x) => cands.some((c) => x === c || x.includes(c)));
  return idx >= 0 ? headersRaw[idx] : "";
}

export function guessMappingSmart(headers: string[], rows: string[][] = []): {
  mapping: Mapping;
  confidence: Record<MappingKey, number>;
  notes: string[];
} {
  const hn = headers.map(norm);
  const find = (cands: string[]) => headerHint(hn, headers, cands);

  // Header-first guess (fast and predictable)
  const base: Mapping = {
    sku: find(["sku", "codigo", "codigo sku", "cod", "codbarras", "codigo de barras", "barcode", "ean"]),
    name: find(["nombre", "producto", "descripcion", "desc", "articulo", "item"]),
    stock: find(["stock", "cantidad", "existencia", "saldo", "inventario", "unidades"]),
    cost: find(["costo", "coste", "precio costo", "costo unitario", "costo u"]),
    price: find(["precio", "venta", "precio venta", "pvp", "precio u"]),
    supplier: find(["proveedor", "supplier", "distribuidor", "marca"]),
    category: find(["categoria", "rubro", "familia", "category"])
  };

  const confidence: Record<MappingKey, number> = {
    sku: base.sku ? 0.9 : 0,
    name: base.name ? 0.9 : 0,
    stock: base.stock ? 0.85 : 0,
    cost: base.cost ? 0.8 : 0,
    price: base.price ? 0.8 : 0,
    supplier: base.supplier ? 0.7 : 0,
    category: base.category ? 0.7 : 0
  };

  const notes: string[] = [];

  // Row inference (only used when something important is missing)
  const sample = rows.slice(0, 60);
  if (sample.length > 0) {
    const colValues = (colIdx: number) => sample.map((r) => String(r[colIdx] ?? "").trim()).filter(Boolean);

    if (!base.sku) {
      let best = "";
      let bestScore = 0;
      headers.forEach((h, i) => {
        const vals = colValues(i);
        if (vals.length < 5) return;
        const u = uniquenessRatio(vals);
        const skuish = vals.slice(0, 30).filter(looksLikeSku).length / Math.min(vals.length, 30);
        const score = 0.55 * u + 0.45 * skuish;
        if (score > bestScore && score > 0.65) {
          bestScore = score;
          best = h;
        }
      });
      if (best) {
        base.sku = best;
        confidence.sku = Math.min(0.85, bestScore);
        notes.push(`Detecté un posible SKU/Código en “${best}”.`);
      }
    }

    if (!base.name) {
      let best = "";
      let bestScore = 0;
      headers.forEach((h, i) => {
        const vals = colValues(i);
        if (vals.length < 5) return;
        const nameish = vals.slice(0, 30).filter(looksLikeName).length / Math.min(vals.length, 30);
        const u = uniquenessRatio(vals);
        const score = 0.7 * nameish + 0.3 * u;
        if (score > bestScore && score > 0.6) {
          bestScore = score;
          best = h;
        }
      });
      if (best) {
        base.name = best;
        confidence.name = Math.min(0.8, bestScore);
        notes.push(`Detecté un posible Nombre/Descripción en “${best}”.`);
      }
    }

    const numericCols = headers
      .map((h, i) => ({ h, i, ...scoreNumeric(colValues(i)) }))
      .filter((x) => x.ratio >= 0.7);

    if (!base.stock) {
      const best = numericCols
        .filter((x) => x.avg <= 5000)
        .sort((a, b) => b.ratio - a.ratio)[0];
      if (best) {
        base.stock = best.h;
        confidence.stock = Math.min(0.8, best.ratio);
        notes.push(`Detecté una columna numérica probable para Stock: “${best.h}”.`);
      }
    }

    if (!base.cost || !base.price) {
      const sorted = numericCols.slice().sort((a, b) => b.avg - a.avg);
      const hi = sorted[0];
      const lo = sorted[1];
      if (hi && lo) {
        if (!base.price) {
          base.price = hi.h;
          confidence.price = 0.65;
          notes.push(`Detecté una columna probable para Precio: “${hi.h}”.`);
        }
        if (!base.cost) {
          base.cost = lo.h;
          confidence.cost = 0.6;
          notes.push(`Detecté una columna probable para Costo: “${lo.h}”.`);
        }
      }
    }
  }

  if (!base.name && !base.sku) {
    notes.push("No pude detectar Nombre ni SKU automáticamente. Mapéalos manualmente.");
  }

  // Ensure mapped values exist in headers
  (Object.keys(base) as MappingKey[]).forEach((k) => {
    if (base[k] && !headers.includes(base[k] as string)) {
      base[k] = "";
      confidence[k] = 0;
    }
  });

  return { mapping: base, confidence, notes };
}

export function templateRows() {
  const headers = ["SKU", "Nombre", "Stock", "Costo", "Precio", "Proveedor", "Categoría"];
  const rows = [
    ["7701234567890", "Coca-Cola 2.25L", "12", "70", "110", "Distribuidora Sur", "Bebidas"],
    ["7891000240307", "Arroz 1kg", "25", "45", "75", "Mayorista Central", "Almacén"],
    ["", "Yerba 1kg", "9", "120", "175", "Mayorista Central", "Almacén"],
    ["001-ABC", "Papel higiénico x4", "18", "90", "140", "HigienePro", "Higiene"]
  ];
  return { headers, rows };
}
