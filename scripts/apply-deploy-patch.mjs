#!/usr/bin/env node
/**
 * Applies deploy scripts to package.json without overwriting existing content.
 */
import fs from "node:fs";
import path from "node:path";

const pkgPath = path.join(process.cwd(), "package.json");
if (!fs.existsSync(pkgPath)) {
  console.error(`❌ package.json not found at ${pkgPath}`);
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.scripts ||= {};

function ensureScript(key, value) {
  if (!pkg.scripts[key] || pkg.scripts[key].trim() !== value.trim()) {
    pkg.scripts[key] = value;
    return true;
  }
  return false;
}

let changed = false;

// Add scripts
changed ||= ensureScript("use:postgres", "node scripts/use-postgres.mjs");
changed ||= ensureScript("db:seed:maybe", "node scripts/seed-maybe.mjs");

// Vercel build: switch schema -> generate -> push -> optional seed -> next build
changed ||= ensureScript(
  "vercel-build",
  "npm run use:postgres && prisma generate && prisma db push && npm run db:seed:maybe && next build"
);

// Ensure postinstall runs prisma generate (preserve existing)
const existing = (pkg.scripts.postinstall || "").trim();
if (!existing) {
  pkg.scripts.postinstall = "prisma generate";
  changed = true;
} else if (!existing.includes("prisma generate")) {
  pkg.scripts.postinstall = `${existing} && prisma generate`;
  changed = true;
}

// Helpful local script to start with postgres
if (!pkg.scripts["dev:pg"]) {
  pkg.scripts["dev:pg"] = "npm run use:postgres && prisma generate && prisma db push && next dev";
  changed = true;
}

if (changed) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log("✅ Updated package.json scripts for Vercel + Postgres.");
} else {
  console.log("ℹ️ package.json already contains required scripts.");
}
