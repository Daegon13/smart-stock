PATCH 18 — Fix deploy build error (safetyDays) + make Prisma generate safer on Windows

What this patch does
1) Fixes Vercel build failing with:
   "'safetyDays' does not exist in type 'StockAlgoOptions'".
   We remove the `safetyDays` property from the object literal in:
   app/api/ai/assistant/route.ts
   (keeps the build green; we can re-introduce a typed safety buffer later).

2) Makes `npm install` less likely to fail on Windows with Prisma EPERM rename errors.
   It replaces `postinstall: prisma generate` with a small Node wrapper that:
   - retries a few times
   - if it still fails on Windows with the known EPERM rename issue, it prints guidance and exits 0
     (so you can finish installing and then re-run generate after stopping node/antivirus locks).

How to apply
1) Unzip this patch at the root of the repo (same level as package.json).
2) Run:
   node scripts/apply-patch-18.mjs
3) Then run (recommended):
   npm install

After applying, Vercel
- Re-deploy. The build should pass the TypeScript step.

If you still get "table Store does not exist" locally
- That means the Postgres database does not have your tables yet.
- Once Prisma generate works, run:
  npm run db:deploy
