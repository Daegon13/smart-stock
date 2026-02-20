import fs from 'fs';
import path from 'path';

function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.writeFileSync(p, s, 'utf8'); }
function exists(p) { return fs.existsSync(p); }

function patchAssistantRoute() {
  const file = path.join(process.cwd(), 'app', 'api', 'ai', 'assistant', 'route.ts');
  if (!exists(file)) {
    console.log('ℹ️  Not found:', file, '(skipping safetyDays patch)');
    return;
  }
  const before = read(file);
  if (!before.includes('safetyDays')) {
    console.log('ℹ️  No safetyDays found in assistant route (already fixed).');
    return;
  }

  // Remove lines like: safetyDays: 4,
  const after = before
    .split('\n')
    .filter(line => !line.match(/\bsafetyDays\s*:\s*[^,]+,?\s*$/))
    .join('\n');

  if (after === before) {
    console.log('⚠️  Could not safely remove safetyDays (pattern mismatch). Please remove it manually.');
    return;
  }
  write(file, after);
  console.log('✅ Removed `safetyDays` from app/api/ai/assistant/route.ts');
}

function patchPackageJson() {
  const file = path.join(process.cwd(), 'package.json');
  if (!exists(file)) {
    console.log('ℹ️  Not found:', file, '(skipping package.json patch)');
    return;
  }
  const pkg = JSON.parse(read(file));
  pkg.scripts = pkg.scripts || {};

  // Ensure the safe generator script exists in scripts.
  const safeScriptPath = path.join(process.cwd(), 'scripts', 'prisma-generate-safe.mjs');
  if (!exists(safeScriptPath)) {
    console.log('⚠️  Missing scripts/prisma-generate-safe.mjs (did you unzip patch at repo root?)');
  }

  // Replace postinstall
  const desired = 'node scripts/prisma-generate-safe.mjs';
  if (pkg.scripts.postinstall !== desired) {
    pkg.scripts.postinstall = desired;
    write(file, JSON.stringify(pkg, null, 2) + '\n');
    console.log('✅ Updated package.json postinstall to use prisma-generate-safe.mjs');
  } else {
    console.log('ℹ️  package.json postinstall already set.');
  }
}

patchAssistantRoute();
patchPackageJson();
