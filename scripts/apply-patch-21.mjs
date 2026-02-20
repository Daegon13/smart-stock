#!/usr/bin/env node
/**
 * Patch 21: Fix Prisma SupplierWhereInput build error in app/api/ai/execute/route.ts
 * - Removes `storeId` from prisma.supplier.findFirst({ where: { storeId, name: ... } })
 *   because Supplier model does not have storeId in schema.prisma.
 */
import fs from "fs";
import path from "path";

const target = path.join(process.cwd(), "app", "api", "ai", "execute", "route.ts");

if (!fs.existsSync(target)) {
  console.error(`❌ Patch 21: File not found: ${target}`);
  process.exit(1);
}

const before = fs.readFileSync(target, "utf8");

// Replace patterns like: where: { storeId, name: { ... } }
// and: where:{storeId,name:{...}}
const patterns = [
  {
    re: /where:\s*{\s*storeId\s*,\s*name\s*:/g,
    to: "where: { name:",
  },
  {
    re: /where\s*:\s*{\s*storeId\s*,\s*name\s*:/g,
    to: "where: { name:",
  },
  {
    re: /where:\s*{\s*storeId\s*,\s*name\s*:\s*{/g,
    to: "where: { name: {",
  },
  {
    re: /where\s*:\s*{\s*storeId\s*,\s*name\s*:\s*{/g,
    to: "where: { name: {",
  },
  {
    re: /where\s*:\s*{\s*storeId\s*,\s*name\s*:/g,
    to: "where: { name:",
  },
  {
    re: /where\s*:\s*{\s*storeId\s*,\s*name\s*:\s*/g,
    to: "where: { name: ",
  },
  {
    re: /where\s*:\s*{\s*storeId\s*,\s*name\s*:\s*{/g,
    to: "where: { name: {",
  },
  {
    re: /where\s*:\s*{\s*storeId\s*,\s*name\s*:\s*/g,
    to: "where: { name: ",
  },
  {
    re: /where\s*:\s*{\s*storeId\s*,\s*name\s*:\s*{/g,
    to: "where: { name: {",
  },
  // Compact form
  {
    re: /where:\{\s*storeId\s*,\s*name:/g,
    to: "where:{name:",
  },
];

let after = before;
for (const p of patterns) after = after.replace(p.re, p.to);

if (after === before) {
  // One more very specific fallback from your build log:
  after = after.replace(
    "where: { storeId, name: { equals:",
    "where: { name: { equals:"
  );
}

if (after === before) {
  console.error("❌ Patch 21: No changes applied. Pattern not found.");
  console.error("   Expected a snippet like: where: { storeId, name: { ... } }");
  process.exit(1);
}

fs.writeFileSync(target, after, "utf8");
console.log("✅ Patch 21 applied: removed `storeId` from supplier where clause in execute route.");
