#!/usr/bin/env node
import { execSync } from "node:child_process";

const flag = (process.env.AUTH_BOOTSTRAP_ENABLED || "").toLowerCase();
if (flag === "true" || flag === "1" || flag === "yes") {
  console.log("👤 AUTH_BOOTSTRAP_ENABLED enabled — running `npm run auth:bootstrap`...");
  execSync("npm run auth:bootstrap", { stdio: "inherit" });
} else {
  console.log("ℹ️ AUTH_BOOTSTRAP_ENABLED not enabled — skipping admin bootstrap.");
}
