#!/usr/bin/env node
/**
 * Patch 25
 * - Removes CardTitle/CardDescription imports from components/AICopilot.tsx
 * - Replaces <CardTitle> / <CardDescription> tags with plain h3/p so it works with your current ui.tsx exports.
 */
import fs from "fs";
import path from "path";

const target = path.join(process.cwd(), "components", "AICopilot.tsx");

function die(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

if (!fs.existsSync(target)) {
  die(`No se encontró ${target}. Ejecutá esto en la raíz del repo (donde está package.json).`);
}

let s = fs.readFileSync(target, "utf8");
let changed = false;

// 1) Remove CardTitle/CardDescription from the ui import (supports '@/components/ui' or './ui' etc.)
//    Example: import { ..., CardTitle, CardDescription } from "@/components/ui";
const uiImportRe = /import\s*{\s*([^}]*)\s*}\s*from\s*["']([^"']*components\/ui[^"']*|\.\/ui|\.{1,2}\/ui|@\/components\/ui)["'];?/g;

s = s.replace(uiImportRe, (full, list, mod) => {
  const parts = list
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => p !== "CardTitle" && p !== "CardDescription");

  // If nothing changed, keep as-is.
  if (parts.join(", ") === list.trim()) return full;

  changed = true;
  return `import { ${parts.join(", ")} } from "${mod}";`;
});

// 2) Replace JSX tags
if (/<CardTitle\b/.test(s)) {
  s = s.replace(/<CardTitle\s*>/g, '<h3 className="text-xl font-semibold leading-none tracking-tight">');
  s = s.replace(/<\/CardTitle\s*>/g, "</h3>");
  changed = true;
}

if (/<CardDescription\b/.test(s)) {
  s = s.replace(/<CardDescription\s*>/g, '<p className="text-sm text-muted-foreground">');
  s = s.replace(/<\/CardDescription\s*>/g, "</p>");
  changed = true;
}

// 3) Clean up any remaining unused named imports (rare, but helps)
// If the file still mentions CardTitle/CardDescription in imports, remove them.
if (/\bCardTitle\b/.test(s) || /\bCardDescription\b/.test(s)) {
  // Only attempt to clean import specifiers; do NOT touch legitimate variable names.
  const importLineRe = /^import\s*{\s*([^}]*)\s*}\s*from\s*["'][^"']+["'];\s*$/gm;
  s = s.replace(importLineRe, (line, list) => {
    if (!/\bCardTitle\b|\bCardDescription\b/.test(list)) return line;
    const parts = list
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => p !== "CardTitle" && p !== "CardDescription");
    changed = true;
    return `import { ${parts.join(", ")} } from ${line.split("from")[1].trim()}`;
  });
}

if (!changed) {
  console.log("ℹ️ Patch 25: no hubo cambios (quizás ya estaba aplicado o el archivo cambió).");
} else {
  fs.writeFileSync(target, s, "utf8");
  console.log("✅ Patch 25 aplicado: AICopilot ya no depende de CardTitle/CardDescription." );
}
