import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const target = path.join(ROOT, 'app', 'api', 'demo', 'seed', 'route.ts');

if (!fs.existsSync(target)) {
  console.error(`❌ No encuentro el archivo: ${target}`);
  console.error('Asegurate de ejecutar este script en la raíz del repo (donde está package.json).');
  process.exit(1);
}

let src = fs.readFileSync(target, 'utf8');
let changed = false;

// 1) Asegurar import type Supplier
const hasSupplierTypeImport = /import\s+type\s*\{[^}]*\bSupplier\b[^}]*\}\s+from\s+["']@prisma\/client["']/.test(src);
const hasAnyPrismaClientImport = /from\s+["']@prisma\/client["']/.test(src);

if (!hasSupplierTypeImport) {
  if (hasAnyPrismaClientImport) {
    // Ya hay un import desde @prisma/client; intentamos inyectar Supplier en el type import si existe,
    // o agregamos un import type separado.
    src = `import type { Supplier } from \"@prisma/client\";\n` + src;
  } else {
    src = `import type { Supplier } from \"@prisma/client\";\n` + src;
  }
  changed = true;
}

// 2) Tipar el array suppliers
const re = /const\s+suppliers\s*=\s*\[\s*\]\s*;?/m;
if (re.test(src)) {
  src = src.replace(re, 'const suppliers: Supplier[] = [];');
  changed = true;
} else {
  console.warn('⚠️ No encontré exactamente `const suppliers = []` para reemplazar.');
  console.warn('Busqué un patrón tipo: const suppliers = [];');
}

// 3) Escribir si cambió
if (!changed) {
  console.log('ℹ️ No se aplicaron cambios (ya estaba arreglado o el patrón no matcheó).');
  process.exit(0);
}

fs.writeFileSync(target, src, 'utf8');
console.log('✅ Patch 23 aplicado: tipado de suppliers en app/api/demo/seed/route.ts');
