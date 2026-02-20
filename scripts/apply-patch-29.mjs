import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const target = path.join(repoRoot, 'components', 'StockIntelligence.tsx');
if (!fs.existsSync(target)) {
  console.error('❌ No se encontró components/StockIntelligence.tsx en', repoRoot);
  process.exit(1);
}
let s = fs.readFileSync(target, 'utf8');
const before = `.map((i) => ({ sku: i.sku ?? null, name: i.name, qty: i.suggestedQty, unit: i.unit ?? "" }));`;
const after = `.map((i) => ({\n            productId: i.productId,\n            sku: i.sku ?? null,\n            name: i.name,\n            qty: i.suggestedQty,\n            suggestedQty: i.suggestedQty,\n            unit: i.unit ?? ""\n          }));`;

if (!s.includes(before)) {
  // attempt a more flexible replacement
  const re = /\.map\(\(i\)\s*=>\s*\(\{\s*sku:\s*i\.sku\s*\?\?\s*null,\s*name:\s*i\.name,\s*qty:\s*i\.suggestedQty,\s*unit:\s*i\.unit\s*\?\?\s*""\s*\}\)\);/m;
  if (!re.test(s)) {
    console.error('❌ No se encontró el patrón de mapeo original para chosen.');
    process.exit(1);
  }
  s = s.replace(re, after);
} else {
  s = s.replace(before, after);
}
fs.writeFileSync(target, s);
console.log('✅ Patch 29 aplicado: chosen ahora incluye productId y suggestedQty.');
