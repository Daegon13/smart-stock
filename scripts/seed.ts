import { prisma } from "../lib/db";

async function main() {
  let store = await prisma.store.findFirst();
  if (!store) {
    store = await prisma.store.create({ data: { name: "Demo Store" } });
  }

  const count = await prisma.product.count({ where: { storeId: store.id } });
  if (count > 0) {
    console.log(`Seed: ya existen ${count} productos, no hago nada.`);
    return;
  }

  await prisma.product.createMany({
    data: [
      { storeId: store.id, name: "Coca Cola 2L", category: "Bebidas", cost: 60, price: 95, stockMin: 6, currentStock: 4, unit: "unidad" },
      { storeId: store.id, name: "Pan lactal", category: "Panadería", cost: 45, price: 75, stockMin: 10, currentStock: 18, unit: "unidad" },
      { storeId: store.id, name: "Yerba 1kg", category: "Almacén", cost: 110, price: 165, stockMin: 8, currentStock: 7, unit: "unidad" }
    ]
  });

  // Movimientos demo (para que el "Stock inteligente" muestre algo interesante)
  const products = await prisma.product.findMany({ where: { storeId: store.id } });
  const byName = new Map(products.map((p) => [p.name, p.id] as const));

  const now = Date.now();
  const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000);

  await prisma.inventoryMovement.createMany({
    data: [
      // Salidas (ventas)
      { storeId: store.id, productId: byName.get("Coca Cola 2L")!, type: "OUT", qty: 3, createdAt: daysAgo(2) },
      { storeId: store.id, productId: byName.get("Coca Cola 2L")!, type: "OUT", qty: 2, createdAt: daysAgo(6) },
      { storeId: store.id, productId: byName.get("Yerba 1kg")!, type: "OUT", qty: 1, createdAt: daysAgo(1) },
      { storeId: store.id, productId: byName.get("Yerba 1kg")!, type: "OUT", qty: 2, createdAt: daysAgo(10) },
      { storeId: store.id, productId: byName.get("Pan lactal")!, type: "OUT", qty: 6, createdAt: daysAgo(3) },
      { storeId: store.id, productId: byName.get("Pan lactal")!, type: "OUT", qty: 5, createdAt: daysAgo(7) },
      // Entrada (compra)
      { storeId: store.id, productId: byName.get("Pan lactal")!, type: "IN", qty: 20, createdAt: daysAgo(8), note: "Compra semanal" }
    ]
  });

  console.log("Seed: listo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
