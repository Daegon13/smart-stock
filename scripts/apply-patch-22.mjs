#!/usr/bin/env node
/**
 * Patch 22: Fix TS build error `Property 'type' does not exist on type 'never'`
 * in app/api/ai/execute/route.ts
 *
 * We avoid changing logic by preserving the original `for (...) {` line and only
 * inserting a safe `actionType` string + swapping `a.type` usages in results.
 */
import fs from "fs";
import path from "path";

const target = path.join(process.cwd(), "app", "api", "ai", "execute", "route.ts");

if (!fs.existsSync(target)) {
  console.error(`❌ Patch 22: File not found: ${target}`);
  process.exit(1);
}

const before = fs.readFileSync(target, "utf8");
let after = before;

// Insert `actionType` immediately after the loop opener.
// Matches: for (const a of actions ... ) {
// Preserves anything inside the parens (e.g. `actions ?? []`).
after = after.replace(
  /(^|\n)([\t ]*)(for\s*\(\s*const\s+a\s+of\s+actions[^\)]*\)\s*\{\s*\n)/g,
  (m, start, indent, loopLine) => {
    const already = new RegExp(`\\n${indent}\\s*const\\s+actionType\\s*=`).test(before);
    if (already) return m;
    return `${start}${indent}${loopLine}` +
      `${indent}  const actionType = typeof (a as any)?.type === "string" ? (a as any).type : "unknown";\n`;
  }
);

// Replace only the `results.push({ action: a.type, ... })` occurrences.
after = after.replace(
  /results\.push\(\{\s*action\s*:\s*a\.type\s*,/g,
  "results.push({ action: actionType,"
);

if (after === before) {
  console.error("❌ Patch 22: No changes applied. Couldn't find the expected patterns.");
  process.exit(1);
}

fs.writeFileSync(target, after, "utf8");
console.log("✅ Patch 22 applied: now uses `actionType` for unsupported/error results instead of `a.type`.\n   Re-run `npm run build` locally, then push to trigger Vercel.");
