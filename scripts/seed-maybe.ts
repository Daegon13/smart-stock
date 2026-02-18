// Seed opcional para entornos de demo.
// Se ejecuta solo si SEED_DEMO=true

async function main() {
  const enabled = String(process.env.SEED_DEMO || "").toLowerCase() === "true";
  if (!enabled) {
    console.log("Seed: SEED_DEMO no está en true, salteo seed.");
    return;
  }

  // Import dinámico para no cargar Prisma si no hace falta
  const mod = await import("./seed");
  // El script seed.ts se auto-ejecuta al importar, así que no hacemos nada más.
  void mod;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
