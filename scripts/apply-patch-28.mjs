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

// Helper: replace a block between two markers if it matches
function replaceBlock(startRe, endRe, replacement) {
  const start = src.search(startRe);
  if (start === -1) return false;
  const afterStart = src.slice(start);
  const endMatch = afterStart.match(endRe);
  if (!endMatch || typeof endMatch.index !== "number") return false;
  const end = start + endMatch.index + endMatch[0].length;
  const before = src.slice(0, start);
  const after = src.slice(end);
  src = before + replacement + after;
  return true;
}

// If Input is already forwardRef, skip
const hasForwardInput = /export\s+const\s+Input\s*=\s*React\.forwardRef/.test(src);
if (!hasForwardInput) {
  // Replace the old function Input block
  const ok = replaceBlock(
    /export\s+function\s+Input\s*\(/,
    /\n\}\n\n/, // ends right after function closes (blank line)
    `export const Input = React.forwardRef<\n  HTMLInputElement,\n  React.InputHTMLAttributes<HTMLInputElement>\n>(function Input({ className = "", ...rest }, ref) {\n  return (\n    <input\n      ref={ref}\n      className={\`w-full rounded-md border border-slate-300 bg-white\/80 px-3 py-2 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-indigo-400 \${className}\`}\n      {...rest}\n    />\n  );\n});\nInput.displayName = "Input";\n\n`
  );
  if (!ok) {
    console.warn("⚠️ Patch 28: no encontré el bloque 'export function Input(...)'. Si tu Input ya está custom, aplicá forwardRef manualmente.");
  }
}

const hasForwardTextarea = /export\s+const\s+Textarea\s*=\s*React\.forwardRef/.test(src);
if (!hasForwardTextarea) {
  const ok = replaceBlock(
    /export\s+function\s+Textarea\s*\(/,
    /\n\}\n\n/,
    `export const Textarea = React.forwardRef<\n  HTMLTextAreaElement,\n  React.TextareaHTMLAttributes<HTMLTextAreaElement>\n>(function Textarea({ className = "", ...rest }, ref) {\n  return (\n    <textarea\n      ref={ref}\n      className={\`w-full rounded-md border border-slate-300 bg-white\/80 px-3 py-2 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-indigo-400 \${className}\`}\n      {...rest}\n    />\n  );\n});\nTextarea.displayName = "Textarea";\n\n`
  );
  if (!ok) {
    console.warn("⚠️ Patch 28: no encontré el bloque 'export function Textarea(...)'.");
  }
}

const hasForwardSelect = /export\s+const\s+Select\s*=\s*React\.forwardRef/.test(src);
if (!hasForwardSelect) {
  const ok = replaceBlock(
    /export\s+function\s+Select\s*\(/,
    /\n\}\n\n/,
    `export const Select = React.forwardRef<\n  HTMLSelectElement,\n  React.SelectHTMLAttributes<HTMLSelectElement>\n>(function Select({ className = "", ...rest }, ref) {\n  return (\n    <select\n      ref={ref}\n      className={\`w-full rounded-md border border-slate-300 bg-white\/80 px-3 py-2 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-indigo-400 \${className}\`}\n      {...rest}\n    />\n  );\n});\nSelect.displayName = "Select";\n\n`
  );
  if (!ok) {
    console.warn("⚠️ Patch 28: no encontré el bloque 'export function Select(...)'.");
  }
}

if (src === original) {
  console.log("ℹ️ Patch 28: no hubo cambios (probablemente ya estaba aplicado)." );
  process.exit(0);
}

fs.writeFileSync(uiPath, src, "utf8");
console.log("✅ Patch 28 aplicado: Input/Textarea/Select ahora soportan ref (React.forwardRef). Eso arregla errores tipo 'ref no existe'.");
