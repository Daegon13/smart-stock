import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const uiPath = path.join(repoRoot, "components", "ui.tsx");

if (!fs.existsSync(uiPath)) {
  console.error(`❌ No se encontró ${uiPath}. ¿Tu repo tiene components/ui.tsx?`);
  process.exit(1);
}

let src = fs.readFileSync(uiPath, "utf8");
const original = src;

// 1) Ensure react types import exists (ReactNode + HTMLAttributes)
const hasReactTypeImport = /import\s+type\s*\{[^}]*\bReactNode\b[^}]*\}\s+from\s+["']react["']/.test(src);
const hasAnyReactImport = /from\s+["']react["']\s*;\s*$/m.test(src);

if (!hasReactTypeImport) {
  // Try to extend an existing type import from react
  const typeImportRe = /import\s+type\s*\{([^}]*)\}\s+from\s+["']react["']\s*;?/;
  if (typeImportRe.test(src)) {
    src = src.replace(typeImportRe, (m, names) => {
      const set = new Set(names.split(",").map(s => s.trim()).filter(Boolean));
      set.add("ReactNode");
      set.add("HTMLAttributes");
      return `import type { ${Array.from(set).sort().join(", ")} } from "react";`;
    });
  } else {
    // Insert a new type import after the last import line (or at top if none)
    const lines = src.split(/\r?\n/);
    let insertAt = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s/.test(lines[i])) insertAt = i + 1;
      else if (insertAt > 0) break;
    }
    lines.splice(insertAt, 0, `import type { ReactNode, HTMLAttributes } from "react";`);
    src = lines.join("\n");
  }
} else {
  // Ensure HTMLAttributes is also present in the same import (optional)
  const typeImportRe = /import\s+type\s*\{([^}]*)\}\s+from\s+["']react["']\s*;?/;
  if (typeImportRe.test(src)) {
    src = src.replace(typeImportRe, (m, names) => {
      const set = new Set(names.split(",").map(s => s.trim()).filter(Boolean));
      if (!set.has("HTMLAttributes")) set.add("HTMLAttributes");
      if (!set.has("ReactNode")) set.add("ReactNode");
      return `import type { ${Array.from(set).sort().join(", ")} } from "react";`;
    });
  }
}

// 2) Widen CardHeader prop types: title/subtitle should accept ReactNode
// This targets the area around "CardHeader" to avoid unintended replacements.
const widenInWindow = (keyword, windowSize, replacers) => {
  const idx = src.indexOf(keyword);
  if (idx === -1) return false;
  const start = Math.max(0, idx - 50);
  const end = Math.min(src.length, idx + windowSize);
  const before = src.slice(0, start);
  let mid = src.slice(start, end);
  const after = src.slice(end);

  const midOriginal = mid;
  for (const [re, to] of replacers) mid = mid.replace(re, to);
  if (mid !== midOriginal) {
    src = before + mid + after;
    return true;
  }
  return false;
};

// Try a few times for different occurrences (type aliases + component props)
const replacers = [
  [/\btitle\s*:\s*string\b/g, "title: ReactNode"],
  [/\btitle\s*\?:\s*string\b/g, "title?: ReactNode"],
  [/\bsubtitle\s*:\s*string\b/g, "subtitle: ReactNode"],
  [/\bsubtitle\s*\?:\s*string\b/g, "subtitle?: ReactNode"],
];

const didWiden = widenInWindow("CardHeader", 1400, replacers);
if (!didWiden) {
  console.warn("⚠️ No pude detectar el bloque de CardHeader para ampliar tipos automáticamente. Igual agregué imports. Revisá components/ui.tsx y cambiá title/subtitle de string -> ReactNode.");
}

// 3) Export CardTitle/CardDescription primitives if missing (helps future patches)
const hasCardTitle = /export\s+(?:function|const)\s+CardTitle\b/.test(src);
const hasCardDesc = /export\s+(?:function|const)\s+CardDescription\b/.test(src);

if (!hasCardTitle || !hasCardDesc) {
  src += "\n\n";
  if (!hasCardTitle) {
    src += `export function CardTitle({ className = \"\", ...props }: HTMLAttributes<HTMLHeadingElement>) {\n`;
    src += `  return <h3 className={\"text-base font-semibold leading-none tracking-tight \" + className} {...props} />;\n`;
    src += `}\n\n`;
  }
  if (!hasCardDesc) {
    src += `export function CardDescription({ className = \"\", ...props }: HTMLAttributes<HTMLParagraphElement>) {\n`;
    src += `  return <p className={\"text-sm text-muted-foreground \" + className} {...props} />;\n`;
    src += `}\n`;
  }
}

if (src === original) {
  console.log("ℹ️ Patch 26: no hubo cambios (ya estaba aplicado o no se encontró patrón)." );
  process.exit(0);
}

fs.writeFileSync(uiPath, src, "utf8");
console.log("✅ Patch 26 aplicado: CardHeader ahora acepta ReactNode (string o JSX) y se exportan CardTitle/CardDescription.");
