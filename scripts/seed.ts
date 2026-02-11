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
