import { PrismaClient, type Category, type Product, type Supplier } from "@prisma/client";

const prisma = new PrismaClient();

const ORG_SLUG = "showcase-org";
const ORG_NAME = "Smart Stock Showcase";
const FRANCHISE_NAME = "Showcase Franchise";
const STORE_NAME = "Minimarket Demo";
const SEED_TAG = "[SHOWCASE-SEED]";

function makeRng(seed = 20260507) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]) {
  return arr[Math.floor(rng() * arr.length)];
}

function daysAgo(days: number, hour = 10, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cfgByCategory(category: string) {
  switch (category) {
    case "Panificados":
      return { leadTimeDays: 1, coverageDays: 3, safetyStock: 4 };
    case "Lácteos":
      return { leadTimeDays: 2, coverageDays: 7, safetyStock: 5 };
    case "Bebidas":
      return { leadTimeDays: 2, coverageDays: 10, safetyStock: 8 };
    case "Congelados":
      return { leadTimeDays: 3, coverageDays: 10, safetyStock: 4 };
    case "Limpieza":
    case "Hogar":
      return { leadTimeDays: 4, coverageDays: 21, safetyStock: 3 };
    case "Kiosco":
      return { leadTimeDays: 7, coverageDays: 30, safetyStock: 2 };
    default:
      return { leadTimeDays: 3, coverageDays: 14, safetyStock: 4 };
  }
}

const supplierSeed = [
  { name: "Distribuidora Río de la Plata", phone: "+598 92 410 102" },
  { name: "Bebidas del Sur", phone: "+598 91 222 870" },
  { name: "Lácteos La Pradera", phone: "+598 94 118 503" },
  { name: "Panificados Montevideo", phone: "+598 95 774 219" },
  { name: "Limpieza & Hogar UY", phone: "+598 97 650 881" },
  { name: "Almacén Mayorista Central", phone: "+598 93 404 330" },
];

const categorySeed = [
  { name: "Bebidas", color: "#2563eb", icon: "🥤" },
  { name: "Almacén", color: "#d97706", icon: "🛒" },
  { name: "Snacks", color: "#db2777", icon: "🍫" },
  { name: "Lácteos", color: "#0891b2", icon: "🥛" },
  { name: "Panificados", color: "#ca8a04", icon: "🥐" },
  { name: "Limpieza", color: "#059669", icon: "🧼" },
  { name: "Hogar", color: "#7c3aed", icon: "🏠" },
  { name: "Congelados", color: "#0284c7", icon: "❄️" },
  { name: "Kiosco", color: "#e11d48", icon: "🧃" },
];

const catalog = [
  { sku: "BEB-001", name: "Coca-Cola 1.5L", category: "Bebidas", unit: "unidad", stockMin: 18, currentStock: 7, supplier: "Bebidas del Sur" },
  { sku: "BEB-002", name: "Pepsi 2L", category: "Bebidas", unit: "unidad", stockMin: 14, currentStock: 18, supplier: "Bebidas del Sur" },
  { sku: "BEB-003", name: "Agua sin gas 2L", category: "Bebidas", unit: "unidad", stockMin: 20, currentStock: 36, supplier: "Bebidas del Sur" },
  { sku: "BEB-004", name: "Agua con gas 2L", category: "Bebidas", unit: "unidad", stockMin: 12, currentStock: 9, supplier: "Bebidas del Sur" },
  { sku: "BEB-005", name: "Jugo naranja 1L", category: "Bebidas", unit: "unidad", stockMin: 10, currentStock: 0, supplier: "Bebidas del Sur" },
  { sku: "BEB-006", name: "Energizante 473ml", category: "Bebidas", unit: "unidad", stockMin: 8, currentStock: 5, supplier: "Distribuidora Río de la Plata" },
  { sku: "ALM-001", name: "Yerba 1kg", category: "Almacén", unit: "unidad", stockMin: 16, currentStock: 6, supplier: "Almacén Mayorista Central" },
  { sku: "ALM-002", name: "Azúcar 1kg", category: "Almacén", unit: "unidad", stockMin: 12, currentStock: 22, supplier: "Almacén Mayorista Central" },
  { sku: "ALM-003", name: "Arroz 1kg", category: "Almacén", unit: "unidad", stockMin: 12, currentStock: 31, supplier: "Almacén Mayorista Central" },
  { sku: "ALM-004", name: "Fideos 500g", category: "Almacén", unit: "unidad", stockMin: 18, currentStock: 14, supplier: "Almacén Mayorista Central" },
  { sku: "ALM-005", name: "Aceite 900ml", category: "Almacén", unit: "unidad", stockMin: 10, currentStock: 3, supplier: "Distribuidora Río de la Plata" },
  { sku: "ALM-006", name: "Atún lata", category: "Almacén", unit: "unidad", stockMin: 10, currentStock: 16, supplier: "Almacén Mayorista Central" },
  { sku: "ALM-007", name: "Salsa de tomate", category: "Almacén", unit: "unidad", stockMin: 12, currentStock: 0, supplier: "Almacén Mayorista Central" },
  { sku: "ALM-008", name: "Mayonesa 500g", category: "Almacén", unit: "unidad", stockMin: 8, currentStock: 13, supplier: "Distribuidora Río de la Plata" },
  { sku: "ALM-009", name: "Ketchup 500g", category: "Almacén", unit: "unidad", stockMin: 8, currentStock: 7, supplier: "Distribuidora Río de la Plata" },
  { sku: "ALM-010", name: "Sal fina 500g", category: "Almacén", unit: "unidad", stockMin: 8, currentStock: 19, supplier: "Almacén Mayorista Central" },
  { sku: "ALM-011", name: "Café instantáneo", category: "Almacén", unit: "unidad", stockMin: 6, currentStock: 4, supplier: "Distribuidora Río de la Plata" },
  { sku: "ALM-012", name: "Té en saquitos", category: "Almacén", unit: "unidad", stockMin: 8, currentStock: 18, supplier: "Distribuidora Río de la Plata" },
  { sku: "SNK-001", name: "Galletitas chocolate", category: "Snacks", unit: "unidad", stockMin: 12, currentStock: 8, supplier: "Distribuidora Río de la Plata" },
  { sku: "SNK-002", name: "Galletitas agua", category: "Snacks", unit: "unidad", stockMin: 10, currentStock: 15, supplier: "Distribuidora Río de la Plata" },
  { sku: "SNK-003", name: "Papas chips", category: "Snacks", unit: "unidad", stockMin: 12, currentStock: 2, supplier: "Distribuidora Río de la Plata" },
  { sku: "SNK-004", name: "Maní salado", category: "Snacks", unit: "unidad", stockMin: 8, currentStock: 11, supplier: "Distribuidora Río de la Plata" },
  { sku: "SNK-005", name: "Chocolate barra", category: "Snacks", unit: "unidad", stockMin: 12, currentStock: 0, supplier: "Distribuidora Río de la Plata" },
  { sku: "LAC-001", name: "Leche entera 1L", category: "Lácteos", unit: "unidad", stockMin: 20, currentStock: 11, supplier: "Lácteos La Pradera" },
  { sku: "LAC-002", name: "Leche descremada 1L", category: "Lácteos", unit: "unidad", stockMin: 14, currentStock: 19, supplier: "Lácteos La Pradera" },
  { sku: "LAC-003", name: "Yogur bebible", category: "Lácteos", unit: "unidad", stockMin: 16, currentStock: 6, supplier: "Lácteos La Pradera" },
  { sku: "LAC-004", name: "Queso rallado 40g", category: "Lácteos", unit: "unidad", stockMin: 8, currentStock: 9, supplier: "Lácteos La Pradera" },
  { sku: "LAC-005", name: "Manteca 200g", category: "Lácteos", unit: "unidad", stockMin: 10, currentStock: 4, supplier: "Lácteos La Pradera" },
  { sku: "PAN-001", name: "Pan lactal", category: "Panificados", unit: "unidad", stockMin: 12, currentStock: 8, supplier: "Panificados Montevideo" },
  { sku: "PAN-002", name: "Bizcochos", category: "Panificados", unit: "kg", stockMin: 5, currentStock: 7, supplier: "Panificados Montevideo" },
  { sku: "PAN-003", name: "Tortas fritas", category: "Panificados", unit: "docena", stockMin: 4, currentStock: 1, supplier: "Panificados Montevideo" },
  { sku: "LIM-001", name: "Detergente 750ml", category: "Limpieza", unit: "unidad", stockMin: 10, currentStock: 16, supplier: "Limpieza & Hogar UY" },
  { sku: "LIM-002", name: "Jabón en polvo 800g", category: "Limpieza", unit: "unidad", stockMin: 8, currentStock: 2, supplier: "Limpieza & Hogar UY" },
  { sku: "LIM-003", name: "Lavandina 1L", category: "Limpieza", unit: "unidad", stockMin: 14, currentStock: 23, supplier: "Limpieza & Hogar UY" },
  { sku: "LIM-004", name: "Suavizante 1L", category: "Limpieza", unit: "unidad", stockMin: 8, currentStock: 0, supplier: "Limpieza & Hogar UY" },
  { sku: "HOG-001", name: "Servilletas", category: "Hogar", unit: "unidad", stockMin: 10, currentStock: 17, supplier: "Limpieza & Hogar UY" },
  { sku: "HOG-002", name: "Papel higiénico x4", category: "Hogar", unit: "pack", stockMin: 12, currentStock: 6, supplier: "Limpieza & Hogar UY" },
  { sku: "CON-001", name: "Helado pote", category: "Congelados", unit: "unidad", stockMin: 6, currentStock: 3, supplier: "Distribuidora Río de la Plata" },
  { sku: "CON-002", name: "Hamburguesas congeladas", category: "Congelados", unit: "caja", stockMin: 5, currentStock: 8, supplier: "Distribuidora Río de la Plata" },
  { sku: "CON-003", name: "Papas fritas congeladas", category: "Congelados", unit: "bolsa", stockMin: 7, currentStock: 11, supplier: "Distribuidora Río de la Plata" },
  { sku: "KIO-001", name: "Encendedor", category: "Kiosco", unit: "unidad", stockMin: 10, currentStock: 14, supplier: "Distribuidora Río de la Plata" },
  { sku: "KIO-002", name: "Pilas AA x2", category: "Kiosco", unit: "pack", stockMin: 8, currentStock: 5, supplier: "Distribuidora Río de la Plata" },
];

type SeedContext = {
  storeId: string;
  suppliersByName: Map<string, Supplier>;
  categoriesByName: Map<string, Category>;
  productsBySku: Map<string, Product>;
};

async function upsertBaseEntities() {
  const organization = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: { name: ORG_NAME },
    create: { slug: ORG_SLUG, name: ORG_NAME },
  });

  const franchise =
    (await prisma.franchise.findFirst({ where: { organizationId: organization.id, name: FRANCHISE_NAME } })) ??
    (await prisma.franchise.create({ data: { organizationId: organization.id, name: FRANCHISE_NAME } }));

  const store =
    (await prisma.store.findFirst({ where: { organizationId: organization.id, name: STORE_NAME } })) ??
    (await prisma.store.findFirst({ where: { name: STORE_NAME } })) ??
    (await prisma.store.create({ data: { organizationId: organization.id, franchiseId: franchise.id, name: STORE_NAME } }));

  const updatedStore = await prisma.store.update({
    where: { id: store.id },
    data: { organizationId: organization.id, franchiseId: franchise.id, name: STORE_NAME },
  });

  return { organization, franchise, store: updatedStore };
}

async function upsertSuppliers() {
  const suppliersByName = new Map<string, Supplier>();

  for (const supplier of supplierSeed) {
    const existing = await prisma.supplier.findFirst({ where: { name: supplier.name } });
    const saved = existing
      ? await prisma.supplier.update({ where: { id: existing.id }, data: { phone: supplier.phone } })
      : await prisma.supplier.create({ data: supplier });
    suppliersByName.set(saved.name, saved);
  }

  return suppliersByName;
}

async function upsertCategories(storeId: string) {
  const categoriesByName = new Map<string, Category>();

  for (const category of categorySeed) {
    const saved = await prisma.category.upsert({
      where: { storeId_scope_slug: { storeId, scope: "PRODUCT", slug: slugify(category.name) } },
      update: { name: category.name, color: category.color, icon: category.icon },
      create: { storeId, scope: "PRODUCT", slug: slugify(category.name), ...category },
    });
    categoriesByName.set(saved.name, saved);
  }

  return categoriesByName;
}

async function upsertProducts(ctx: Omit<SeedContext, "productsBySku">) {
  const rng = makeRng();
  const productsBySku = new Map<string, Product>();

  for (const [idx, item] of catalog.entries()) {
    const cfg = cfgByCategory(item.category);
    const supplier = ctx.suppliersByName.get(item.supplier);
    const category = ctx.categoriesByName.get(item.category);

    if (!supplier) throw new Error(`Proveedor no encontrado para ${item.name}: ${item.supplier}`);
    if (!category) throw new Error(`Categoría no encontrada para ${item.name}: ${item.category}`);

    const baseCost = 24 + idx * 3.7 + rng() * 35;
    const cost = money(baseCost);
    const price = money(baseCost * (1.38 + rng() * 0.42));
    const existing = await prisma.product.findFirst({ where: { storeId: ctx.storeId, sku: item.sku } });

    const data = {
      name: item.name,
      sku: item.sku,
      category: item.category,
      categoryId: category.id,
      unit: item.unit,
      cost,
      price,
      stockMin: item.stockMin,
      currentStock: item.currentStock,
      supplierId: supplier.id,
      ...cfg,
    };

    const saved = existing
      ? await prisma.product.update({ where: { id: existing.id }, data })
      : await prisma.product.create({ data: { storeId: ctx.storeId, ...data } });
    productsBySku.set(saved.sku ?? item.sku, saved);
  }

  return productsBySku;
}

async function resetSeedGeneratedActivity(storeId: string) {
  const seedOrders = await prisma.purchaseOrder.findMany({ where: { storeId, notes: { contains: SEED_TAG } }, select: { id: true } });
  if (seedOrders.length > 0) {
    await prisma.purchaseOrderItem.deleteMany({ where: { orderId: { in: seedOrders.map((order) => order.id) } } });
    await prisma.purchaseOrder.deleteMany({ where: { id: { in: seedOrders.map((order) => order.id) } } });
  }

  const seedTickets = await prisma.ticket.findMany({ where: { storeId, hash: { startsWith: "showcase-ticket-" } }, select: { id: true } });
  if (seedTickets.length > 0) {
    await prisma.ticketLine.deleteMany({ where: { ticketId: { in: seedTickets.map((ticket) => ticket.id) } } });
    await prisma.ticket.deleteMany({ where: { id: { in: seedTickets.map((ticket) => ticket.id) } } });
  }

  await prisma.inventoryMovement.deleteMany({ where: { storeId, note: { contains: SEED_TAG } } });
  await prisma.purchaseDraft.deleteMany({ where: { storeId, title: { startsWith: "Showcase" } } });
  await prisma.ticketImportBatch.deleteMany({ where: { storeId, fileName: "showcase-pos-may.csv" } });
}

async function createMovements(ctx: SeedContext) {
  const rng = makeRng(42);
  const products = [...ctx.productsBySku.values()];
  const movements = [];

  for (let d = 1; d <= 28; d += 1) {
    const outCount = 7 + (d % 6);
    const inCount = d % 7 === 0 ? 5 : d % 5 === 0 ? 3 : 1;

    for (let i = 0; i < outCount; i += 1) {
      const product = pick(rng, products);
      movements.push({
        storeId: ctx.storeId,
        productId: product.id,
        type: "OUT",
        qty: 1 + Math.floor(rng() * 5),
        note: `${SEED_TAG} Venta mostrador / POS`,
        createdAt: daysAgo(d, 9 + Math.floor(rng() * 11), Math.floor(rng() * 60)),
      });
    }

    for (let i = 0; i < inCount; i += 1) {
      const product = pick(rng, products);
      movements.push({
        storeId: ctx.storeId,
        productId: product.id,
        type: "IN",
        qty: 8 + Math.floor(rng() * 28),
        note: `${SEED_TAG} Reposición proveedor`,
        createdAt: daysAgo(d, 8 + Math.floor(rng() * 5), Math.floor(rng() * 60)),
      });
    }

    if (d % 6 === 0) {
      const product = pick(rng, products);
      movements.push({
        storeId: ctx.storeId,
        productId: product.id,
        type: "ADJUST",
        qty: product.currentStock,
        note: `${SEED_TAG} Conteo rápido de góndola`,
        createdAt: daysAgo(d, 20, 15),
      });
    }
  }

  const result = await prisma.inventoryMovement.createMany({ data: movements });
  return result.count;
}

async function createTickets(ctx: SeedContext) {
  const batch = await prisma.ticketImportBatch.create({
    data: {
      storeId: ctx.storeId,
      source: "CSV",
      fileName: "showcase-pos-may.csv",
      notes: `${SEED_TAG} Import POS demo con líneas conciliadas y pendientes`,
      ticketsCount: 6,
      linesCount: 18,
      movementsCount: 14,
      skippedCount: 1,
      duplicatesCount: 2,
      errorCount: 0,
      unmatchedLines: 4,
      importedAt: daysAgo(1, 8, 30),
    },
  });

  const ticketData = [
    {
      externalId: "POS-10401",
      issuedAt: daysAgo(1, 10, 12),
      lines: [
        { sku: "BEB-001", qty: 2, unitPrice: 118 },
        { sku: "PAN-001", qty: 1, unitPrice: 92 },
        { sku: "SNK-003", qty: 2, unitPrice: 64 },
      ],
    },
    {
      externalId: "POS-10402",
      issuedAt: daysAgo(1, 13, 48),
      lines: [
        { sku: "LAC-001", qty: 3, unitPrice: 54 },
        { sku: "ALM-001", qty: 1, unitPrice: 210 },
        { name: "Promo alfajor triple", qty: 2, unitPrice: 45 },
      ],
    },
    {
      externalId: "POS-10403",
      issuedAt: daysAgo(2, 18, 5),
      lines: [
        { sku: "ALM-005", qty: 1, unitPrice: 178 },
        { sku: "BEB-005", qty: 4, unitPrice: 82 },
        { name: "Recarga celular", qty: 1, unitPrice: 200 },
      ],
    },
    {
      externalId: "POS-10404",
      issuedAt: daysAgo(3, 11, 22),
      lines: [
        { sku: "HOG-002", qty: 1, unitPrice: 225 },
        { sku: "LIM-002", qty: 2, unitPrice: 156 },
        { name: "Bolsa camiseta mediana", qty: 1, unitPrice: 8 },
      ],
    },
    {
      externalId: "POS-10405",
      issuedAt: daysAgo(4, 16, 36),
      lines: [
        { sku: "SNK-005", qty: 3, unitPrice: 72 },
        { sku: "PAN-003", qty: 1, unitPrice: 180 },
        { name: "Combo cafetería", qty: 1, unitPrice: 130 },
      ],
    },
    {
      externalId: "POS-10406",
      issuedAt: daysAgo(5, 19, 2),
      lines: [
        { sku: "CON-001", qty: 2, unitPrice: 280 },
        { sku: "KIO-002", qty: 1, unitPrice: 140 },
        { sku: "ALM-007", qty: 2, unitPrice: 74 },
      ],
    },
  ];

  let ticketCount = 0;
  let lineCount = 0;

  for (const [idx, ticket] of ticketData.entries()) {
    const total = money(ticket.lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0));
    const savedTicket = await prisma.ticket.create({
      data: {
        storeId: ctx.storeId,
        batchId: batch.id,
        externalId: ticket.externalId,
        issuedAt: ticket.issuedAt,
        total,
        hash: `showcase-ticket-${idx + 1}`,
      },
    });
    ticketCount += 1;

    for (const line of ticket.lines) {
      const sku = "sku" in line && typeof line.sku === "string" ? line.sku : null;
      const rawName = "name" in line && typeof line.name === "string" ? line.name : null;
      const product = sku ? ctx.productsBySku.get(sku) : null;
      await prisma.ticketLine.create({
        data: {
          ticketId: savedTicket.id,
          productId: product?.id,
          sku,
          name: product?.name ?? rawName,
          qty: line.qty,
          unitPrice: line.unitPrice,
          lineTotal: money(line.qty * line.unitPrice),
          matchedBy: product ? "SKU" : null,
          resolvedAt: product ? ticket.issuedAt : null,
        },
      });
      lineCount += 1;
    }
  }

  return { batches: 1, tickets: ticketCount, ticketLines: lineCount };
}

async function createOrdersAndDrafts(ctx: SeedContext) {
  const supplierCentral = ctx.suppliersByName.get("Almacén Mayorista Central");
  const supplierBebidas = ctx.suppliersByName.get("Bebidas del Sur");
  const supplierLimpieza = ctx.suppliersByName.get("Limpieza & Hogar UY");
  if (!supplierCentral || !supplierBebidas || !supplierLimpieza) throw new Error("Faltan proveedores para órdenes demo");

  const order1 = await prisma.purchaseOrder.create({
    data: {
      storeId: ctx.storeId,
      supplierId: supplierCentral.id,
      title: "Pedido urgente almacén",
      status: "SENT",
      notes: `${SEED_TAG} Bajo stock detectado en productos de alta rotación`,
      createdAt: daysAgo(1, 17, 20),
      items: {
        create: [
          { productId: ctx.productsBySku.get("ALM-001")!.id, qtyOrdered: 24, qtyReceived: 0, unitCost: 145, note: "Yerba crítica" },
          { productId: ctx.productsBySku.get("ALM-005")!.id, qtyOrdered: 18, qtyReceived: 0, unitCost: 121, note: "Aceite por debajo del mínimo" },
          { productId: ctx.productsBySku.get("ALM-007")!.id, qtyOrdered: 24, qtyReceived: 0, unitCost: 49, note: "Sin stock" },
        ],
      },
    },
  });

  const order2 = await prisma.purchaseOrder.create({
    data: {
      storeId: ctx.storeId,
      supplierId: supplierBebidas.id,
      title: "Reposición bebidas fin de semana",
      status: "PARTIAL",
      notes: `${SEED_TAG} Pedido parcial recibido para mostrar seguimiento`,
      createdAt: daysAgo(5, 12, 0),
      items: {
        create: [
          { productId: ctx.productsBySku.get("BEB-001")!.id, qtyOrdered: 36, qtyReceived: 18, unitCost: 76 },
          { productId: ctx.productsBySku.get("BEB-005")!.id, qtyOrdered: 24, qtyReceived: 0, unitCost: 52, note: "Proveedor sin entrega" },
          { productId: ctx.productsBySku.get("BEB-003")!.id, qtyOrdered: 30, qtyReceived: 30, unitCost: 38 },
        ],
      },
    },
  });

  const draftCsv = [
    "SKU,Producto,Cantidad,Unidad",
    "LIM-002,Jabón en polvo 800g,12,unidad",
    "LIM-004,Suavizante 1L,10,unidad",
    "HOG-002,Papel higiénico x4,18,pack",
  ].join("\n");

  await prisma.purchaseDraft.create({
    data: {
      storeId: ctx.storeId,
      supplierId: supplierLimpieza.id,
      title: "Showcase borrador limpieza",
      message: "Hola! Necesito reponer limpieza y hogar según alertas de Smart Stock.",
      csv: draftCsv,
      itemCount: 3,
      createdAt: daysAgo(0, 9, 5),
    },
  });

  return { orders: 2, drafts: 1, orderIds: [order1.id, order2.id] };
}

async function createAliases(ctx: SeedContext) {
  const aliases = [
    { sku: "BEB-001", kind: "CODE", key: "7790895000997" },
    { sku: "ALM-001", kind: "NAME", key: "yerba 1 kilo" },
    { sku: "PAN-001", kind: "NAME", key: "pan lactal familiar" },
    { sku: "LAC-001", kind: "CODE", key: "7791337001112" },
    { sku: "HOG-002", kind: "NAME", key: "papel higienico pack 4" },
  ];

  for (const alias of aliases) {
    const product = ctx.productsBySku.get(alias.sku);
    if (!product) continue;
    await prisma.productAlias.upsert({
      where: { storeId_kind_key: { storeId: ctx.storeId, kind: alias.kind, key: alias.key } },
      update: { productId: product.id },
      create: { storeId: ctx.storeId, productId: product.id, kind: alias.kind, key: alias.key },
    });
  }

  return aliases.length;
}

async function createAuditInsights(storeId: string, orderIds: string[]) {
  await prisma.auditLog.deleteMany({ where: { storeId, action: { startsWith: "SHOWCASE_" } } });
  await prisma.auditLog.createMany({
    data: [
      {
        storeId,
        role: "owner",
        action: "SHOWCASE_LOW_STOCK_ALERT",
        entity: "Product",
        payload: JSON.stringify({ message: "12 productos por debajo del mínimo; 5 sin stock." }),
        createdAt: daysAgo(0, 8, 45),
      },
      {
        storeId,
        role: "manager",
        action: "SHOWCASE_PURCHASE_ORDER_CREATED",
        entity: "PurchaseOrder",
        entityId: orderIds[0],
        payload: JSON.stringify({ supplier: "Almacén Mayorista Central", items: 3 }),
        createdAt: daysAgo(1, 17, 25),
      },
      {
        storeId,
        role: "staff",
        action: "SHOWCASE_POS_IMPORT_REVIEWED",
        entity: "TicketImportBatch",
        payload: JSON.stringify({ unmatchedLines: 4, duplicates: 2 }),
        createdAt: daysAgo(1, 9, 10),
      },
    ],
  });

  return 3;
}

async function main() {
  const { organization, franchise, store } = await upsertBaseEntities();
  const suppliersByName = await upsertSuppliers();
  const categoriesByName = await upsertCategories(store.id);
  const productsBySku = await upsertProducts({ storeId: store.id, suppliersByName, categoriesByName });
  const ctx: SeedContext = { storeId: store.id, suppliersByName, categoriesByName, productsBySku };

  await resetSeedGeneratedActivity(store.id);

  const movementCount = await createMovements(ctx);
  const tickets = await createTickets(ctx);
  const orders = await createOrdersAndDrafts(ctx);
  const aliasCount = await createAliases(ctx);
  const auditLogCount = await createAuditInsights(store.id, orders.orderIds);

  console.log("Showcase seed listo.");
  console.log(`Organization: ${organization.name} (${organization.slug})`);
  console.log(`Franchise: ${franchise.name}`);
  console.log(`Store: ${store.name} (${store.id})`);
  console.log(
    `Dataset: ${suppliersByName.size} proveedores, ${categoriesByName.size} categorías, ${productsBySku.size} productos, ${movementCount} movimientos, ${tickets.tickets} tickets/${tickets.ticketLines} líneas, ${orders.orders} órdenes, ${orders.drafts} borrador, ${aliasCount} aliases, ${auditLogCount} insights.`,
  );
}

main()
  .catch((error) => {
    console.error("Showcase seed falló:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
