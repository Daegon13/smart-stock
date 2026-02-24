import type { Supplier } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultStore } from "@/lib/defaultStore";
import { isDemoAllowed } from "@/lib/demoGate";
import { getRequestId, logApiEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";

type SeedResult = {
  ok: boolean;
  message: string;
  created?: { suppliers: number; products: number; movements: number };
};

function makeRng(seed = 1337) {
  let s = seed >>> 0;
  return () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]) {
  return arr[Math.floor(rng() * arr.length)];
}

function cfgByCategory(category: string | null) {
  switch (category) {
    case "Panificados":
      return { leadTimeDays: 1, coverageDays: 3, safetyStock: 2 };
    case "Lácteos":
      return { leadTimeDays: 2, coverageDays: 7, safetyStock: 3 };
    case "Bebidas":
      return { leadTimeDays: 2, coverageDays: 10, safetyStock: 4 };
    case "Congelados":
      return { leadTimeDays: 3, coverageDays: 10, safetyStock: 2 };
    case "Limpieza":
    case "Hogar":
      return { leadTimeDays: 4, coverageDays: 21, safetyStock: 2 };
    case "Kiosco":
      return { leadTimeDays: 7, coverageDays: 30, safetyStock: 0 };
    default:
      return { leadTimeDays: 3, coverageDays: 14, safetyStock: 2 };
  }
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const json = (body: SeedResult, status = 200) =>
    NextResponse.json(body, { status, headers: { "x-request-id": requestId, "cache-control": "no-store" } });
  // Seguridad: el endpoint de seed demo NO debería estar disponible en producción.
  // Para habilitarlo explícitamente (solo bajo tu responsabilidad), setear ALLOW_DEMO_SEED=true.
  if (!isDemoAllowed()) {
    logApiEvent({
      requestId,
      route: "/api/demo/seed",
      method: "POST",
      status: 403,
      message: "blocked by demo gate"
    });
    return json({ ok: false, message: "Seed demo deshabilitado en producción." } satisfies SeedResult, 403);
  }

  const store = await getOrCreateDefaultStore();
  const existing = await prisma.product.count({ where: { storeId: store.id } });
  if (existing > 0) {
    const body: SeedResult = {
      ok: false,
      message: "Ya existen productos en este local. (Para no pisarte datos, el seed demo solo corre si está vacío.)"
    };
    logApiEvent({
      requestId,
      route: "/api/demo/seed",
      method: "POST",
      storeId: store.id,
      status: 409,
      message: "seed skipped: store not empty"
    });
    return json(body, 409);
  }

  // Renombramos el store por estética, sin crear uno nuevo
  await prisma.store.update({ where: { id: store.id }, data: { name: "Minimarket Demo" } });

  const rng = makeRng(20260216);

  // Proveedores demo
  const supplierNames = [
    "Distribuidora Río de la Plata",
    "Bebidas del Sur",
    "Lácteos La Pradera",
    "Panificados Montevideo",
    "Limpieza & Hogar UY",
    "Almacén Mayorista Central"
  ];

  const suppliers: Supplier[] = [];
  for (const name of supplierNames) {
    suppliers.push(
      await prisma.supplier.create({
        data: {
          name,
          phone: rng() > 0.5 ? `09${Math.floor(1000000 + rng() * 8999999)}` : null
        }
      })
    );
  }

  const catalog = [
    { name: "Coca-Cola 1.5L", category: "Bebidas", unit: "unidad" },
    { name: "Pepsi 2L", category: "Bebidas", unit: "unidad" },
    { name: "Agua sin gas 2L", category: "Bebidas", unit: "unidad" },
    { name: "Agua con gas 2L", category: "Bebidas", unit: "unidad" },
    { name: "Jugo naranja 1L", category: "Bebidas", unit: "unidad" },
    { name: "Yerba 1kg", category: "Almacén", unit: "unidad" },
    { name: "Azúcar 1kg", category: "Almacén", unit: "unidad" },
    { name: "Arroz 1kg", category: "Almacén", unit: "unidad" },
    { name: "Fideos 500g", category: "Almacén", unit: "unidad" },
    { name: "Aceite 900ml", category: "Almacén", unit: "unidad" },
    { name: "Galletitas chocolate", category: "Snack", unit: "unidad" },
    { name: "Galletitas agua", category: "Snack", unit: "unidad" },
    { name: "Papas chips", category: "Snack", unit: "unidad" },
    { name: "Maní salado", category: "Snack", unit: "unidad" },
    { name: "Chocolate barra", category: "Snack", unit: "unidad" },
    { name: "Leche entera 1L", category: "Lácteos", unit: "unidad" },
    { name: "Leche descremada 1L", category: "Lácteos", unit: "unidad" },
    { name: "Yogur bebible", category: "Lácteos", unit: "unidad" },
    { name: "Queso rallado 40g", category: "Lácteos", unit: "unidad" },
    { name: "Manteca 200g", category: "Lácteos", unit: "unidad" },
    { name: "Pan lactal", category: "Panificados", unit: "unidad" },
    { name: "Bizcochos", category: "Panificados", unit: "unidad" },
    { name: "Tortas fritas", category: "Panificados", unit: "unidad" },
    { name: "Detergente 750ml", category: "Limpieza", unit: "unidad" },
    { name: "Jabón en polvo 800g", category: "Limpieza", unit: "unidad" },
    { name: "Lavandina 1L", category: "Limpieza", unit: "unidad" },
    { name: "Suavizante 1L", category: "Limpieza", unit: "unidad" },
    { name: "Servilletas", category: "Hogar", unit: "unidad" },
    { name: "Papel higiénico x4", category: "Hogar", unit: "unidad" },
    { name: "Atún lata", category: "Almacén", unit: "unidad" },
    { name: "Salsa de tomate", category: "Almacén", unit: "unidad" },
    { name: "Mayonesa 500g", category: "Almacén", unit: "unidad" },
    { name: "Ketchup 500g", category: "Almacén", unit: "unidad" },
    { name: "Sal fina 500g", category: "Almacén", unit: "unidad" },
    { name: "Café instantáneo", category: "Almacén", unit: "unidad" },
    { name: "Té en saquitos", category: "Almacén", unit: "unidad" },
    { name: "Energizante 473ml", category: "Bebidas", unit: "unidad" },
    { name: "Helado pote", category: "Congelados", unit: "unidad" },
    { name: "Hamburguesas congeladas", category: "Congelados", unit: "unidad" },
    { name: "Papas fritas congeladas", category: "Congelados", unit: "unidad" },
    { name: "Encendedor", category: "Kiosco", unit: "unidad" }
  ];

  const productCreates = catalog.map((c, idx) => {
    const cost = Math.round((20 + rng() * 180) * 10) / 10;
    const price = Math.round(cost * (1.35 + rng() * 0.75) * 10) / 10;
    const stockMin = Math.floor(2 + rng() * 10);

    // stock actual, con algunos bajos para “alertas”
    let currentStock = Math.floor(rng() * 28);
    if (idx % 9 === 0) currentStock = Math.max(0, Math.floor(stockMin * 0.6)); // algunos críticos

    const supplier = pick(rng, suppliers);
    const cfg = cfgByCategory(c.category);

    return prisma.product.create({
      data: {
        storeId: store.id,
        supplierId: supplier.id,
        name: c.name,
        sku: `SKU-${String(idx + 1).padStart(4, "0")}`,
        category: c.category,
        unit: c.unit,
        cost,
        price,
        stockMin,
        leadTimeDays: cfg.leadTimeDays,
        coverageDays: cfg.coverageDays,
        safetyStock: cfg.safetyStock,
        currentStock
      }
    });
  });

  const createdProducts = await prisma.$transaction(productCreates);

  // Movimientos demo (últimos 14 días)
  const now = new Date();
  const days = 14;
  const movements: any[] = [];

  for (let d = 0; d < days; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() - d);

    const outCount = 10 + Math.floor(rng() * 18);
    const inCount = 2 + Math.floor(rng() * 6);

    for (let i = 0; i < outCount; i++) {
      const p = pick(rng, createdProducts);
      const qty = 1 + Math.floor(rng() * 5);
      const createdAt = new Date(day);
      createdAt.setHours(9 + Math.floor(rng() * 10), Math.floor(rng() * 59), 0, 0);

      movements.push({
        storeId: store.id,
        productId: p.id,
        type: "OUT",
        qty,
        note: rng() > 0.85 ? "Venta mostrador" : null,
        createdAt
      });
    }

    for (let i = 0; i < inCount; i++) {
      const p = pick(rng, createdProducts);
      const qty = 6 + Math.floor(rng() * 18);
      const createdAt = new Date(day);
      createdAt.setHours(8 + Math.floor(rng() * 6), Math.floor(rng() * 59), 0, 0);

      movements.push({
        storeId: store.id,
        productId: p.id,
        type: "IN",
        qty,
        note: rng() > 0.7 ? "Reposición proveedor" : null,
        createdAt
      });
    }

    if (rng() > 0.7) {
      const p = pick(rng, createdProducts);
      const createdAt = new Date(day);
      createdAt.setHours(20, 0, 0, 0);
      movements.push({
        storeId: store.id,
        productId: p.id,
        type: "ADJUST",
        qty: Math.floor(rng() * 25),
        note: "Conteo rápido",
        createdAt
      });
    }
  }

  // bulk insert
  const createdMov = await prisma.inventoryMovement.createMany({ data: movements });

  const body: SeedResult = {
    ok: true,
    message: "Datos demo cargados.",
    created: { suppliers: suppliers.length, products: createdProducts.length, movements: createdMov.count }
  };

  logApiEvent({
    requestId,
    route: "/api/demo/seed",
    method: "POST",
    storeId: store.id,
    status: 201,
    message: `seed ok (suppliers=${suppliers.length}, products=${createdProducts.length}, movements=${createdMov.count})`
  });

  return json(body, 201);
}
