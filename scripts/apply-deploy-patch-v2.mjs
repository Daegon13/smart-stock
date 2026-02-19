#!/usr/bin/env node
/**
 * Patch v2 for Vercel deployment scripts.
 * - Avoids running `prisma db push` during Vercel build (can hang/time out, and mutates DB at build time)
 * - Adds DB bootstrap scripts you can run manually (or in CI) using DIRECT_URL
 */
import fs from 'node:fs';
import path from 'node:path';

const pkgPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error('❌ package.json not found. Run this from repo root.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkg.scripts = pkg.scripts || {};

// Keep existing scripts, but ensure these exist / are updated.
// Build should NOT run db push/seed; do DB prep separately.
pkg.scripts['vercel-build'] = 'npm run use:postgres && prisma generate && next build';

// One-time DB bootstrap (run manually/CI): pushes schema + seeds (optional)
pkg.scripts['db:deploy'] = 'npm run use:postgres && prisma generate && prisma db push && npm run db:seed:maybe';

// Convenience
pkg.scripts['db:push'] = 'npm run use:postgres && prisma db push';
pkg.scripts['db:generate'] = 'prisma generate';

// Preserve: dev, dev:pg, use:postgres, db:seed:maybe, etc.
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('✅ Updated package.json scripts (vercel-build safe + db:deploy).');
