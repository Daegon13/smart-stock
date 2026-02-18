#!/usr/bin/env node
/**
 * Run db seed only when SEED_DEMO=true.
 * This avoids seeding on every build/deploy unless explicitly requested.
 */
import { execSync } from "node:child_process";

const flag = (process.env.SEED_DEMO || "").toLowerCase();
if (flag === "true" || flag === "1" || flag === "yes") {
  console.log("🌱 SEED_DEMO enabled — running `npm run db:seed`...");
  execSync("npm run db:seed", { stdio: "inherit" });
} else {
  console.log("ℹ️ SEED_DEMO not enabled — skipping seed.");
}
