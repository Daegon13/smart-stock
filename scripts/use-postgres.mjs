#!/usr/bin/env node
/**
 * Switch Prisma datasource provider to PostgreSQL in-place.
 * Safe: only rewrites the `datasource db { ... }` block, keeps models intact.
 */
import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
if (!fs.existsSync(schemaPath)) {
  console.error(`❌ prisma/schema.prisma not found at ${schemaPath}`);
  process.exit(1);
}

const src = fs.readFileSync(schemaPath, "utf8");

// Match datasource db block (naive but practical)
const reBlock = /datasource\s+db\s*\{[\s\S]*?\}/m;
if (!reBlock.test(src)) {
  console.error("❌ Could not find `datasource db { ... }` block in prisma/schema.prisma");
  process.exit(1);
}

const target = `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}`;

const next = src.replace(reBlock, target);

if (next === src) {
  console.log("ℹ️ Prisma datasource already set (no changes).");
} else {
  fs.writeFileSync(schemaPath, next, "utf8");
  console.log("✅ Updated Prisma datasource to PostgreSQL.");
}
