#!/usr/bin/env node
/**
 * Patch 24 - Fix CardHeader usage in components/AICopilot.tsx
 * Replaces invalid <CardHeader title="" subtitle=""/> with shadcn-style children:
 * <CardHeader><CardTitle>...</CardTitle><CardDescription>...</CardDescription></CardHeader>
 *
 * Also ensures CardTitle and CardDescription are imported from the same ui module import.
 */
import fs from "fs";
import path from "path";

const target = path.join(process.cwd(), "components", "AICopilot.tsx");

function die(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

if (!fs.existsSync(target)) {
  die(`No se encontró ${target}. Asegurate de ejecutar esto en la raíz del repo (donde está package.json).`);
}

let s = fs.readFileSync(target, "utf8");
let changed = false;

// 1) Replace the CardHeader self-closing tag with title/subtitle props.
const specificRe = /<CardHeader\b[^>]*\btitle="Copiloto IA \(operaciones\)"[^>]*\bsubtitle="([^"]+)"[^>]*\/\>/m;
const genericSubtitleRe = /<CardHeader\b[^>]*\btitle="([^"]+)"[^>]*\bsubtitle="([^"]+)"[^>]*\/\>/m;

if (specificRe.test(s)) {
  s = s.replace(specificRe, (_m, subtitle) => {
    changed = true;
    return `<CardHeader>\n            <CardTitle>Copiloto IA (operaciones)</CardTitle>\n            <CardDescription>${subtitle}</CardDescription>\n          </CardHeader>`;
  });
} else if (genericSubtitleRe.test(s)) {
  s = s.replace(genericSubtitleRe, (_m, title, subtitle) => {
    changed = true;
    return `<CardHeader>\n            <CardTitle>${title}</CardTitle>\n            <CardDescription>${subtitle}</CardDescription>\n          </CardHeader>`;
  });
}

// 2) Ensure imports include CardTitle and CardDescription (from the same ui import that has CardHeader).
const importRe = /import\s*{\s*([^}]*\bCardHeader\b[^}]*)\s*}\s*from\s*["']([^"']*ui[^"']*)["'];?/m;
const m = s.match(importRe);

function addToImportList(listStr, addName) {
  const parts = listStr.split(",").map(p => p.trim()).filter(Boolean);
  if (!parts.includes(addName)) parts.push(addName);
  return parts.join(", ");
}

if (m) {
  const full = m[0];
  const list = m[1];
  const mod = m[2];

  let newList = list;
  newList = addToImportList(newList, "CardTitle");
  newList = addToImportList(newList, "CardDescription");

  if (newList !== list) {
    const repl = `import { ${newList} } from "${mod}";`;
    s = s.replace(full, repl);
    changed = true;
  }
} else {
  // Fallback: add a safe import if needed.
  const usesTitle = /\b<CardTitle\b/.test(s);
  const usesDesc = /\b<CardDescription\b/.test(s);
  const importBlock = (s.match(/import[\s\S]*?from[\s\S]*?;/g) || []).join("\n");
  const hasTitleImport = /\bCardTitle\b/.test(importBlock);
  const hasDescImport = /\bCardDescription\b/.test(importBlock);

  if ((usesTitle && !hasTitleImport) || (usesDesc && !hasDescImport)) {
    const allImports = [...s.matchAll(/^import .*?;$/gm)];
    const insertAt = allImports.length
      ? (allImports[allImports.length - 1].index + allImports[allImports.length - 1][0].length)
      : 0;
    const extra = `\nimport { CardTitle, CardDescription } from "./ui";\n`;
    s = s.slice(0, insertAt) + extra + s.slice(insertAt);
    changed = true;
  }
}

if (!changed) {
  console.log("ℹ️ Patch 24: no hubo cambios (quizás ya estaba aplicado o el archivo cambió).");
} else {
  fs.writeFileSync(target, s, "utf8");
  console.log("✅ Patch 24 aplicado: CardHeader en AICopilot corregido (title/subtitle -> CardTitle/CardDescription)." );
}
