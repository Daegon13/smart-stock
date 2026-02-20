import { spawnSync } from 'child_process';

function runOnce() {
  const res = spawnSync('npx', ['prisma', 'generate'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  return res.status ?? 1;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const MAX_RETRIES = 3;
let lastCode = 0;

for (let i = 0; i < MAX_RETRIES; i++) {
  lastCode = runOnce();
  if (lastCode === 0) process.exit(0);

  // Small backoff and retry. On Windows, the EPERM rename is often transient.
  await sleep(750);
}

// If still failing, decide how to handle.
// On Windows, the common cause is a locked query_engine DLL (node/dev server/antivirus).
// We prefer not to brick `npm install` forever; we give clear instructions.
if (process.platform === 'win32') {
  console.log('\n⚠️ Prisma generate failed on Windows after retries.');
  console.log('   This is usually a file-lock / antivirus issue (EPERM rename of query_engine-windows.dll.node).');
  console.log('\n✅ Fix (do this once):');
  console.log('  1) Stop your dev server (Ctrl+C) and close any node processes that may be using Prisma.');
  console.log('  2) In PowerShell:');
  console.log('     taskkill /F /IM node.exe');
  console.log('  3) Delete the prisma engine cache folder:');
  console.log('     rmdir /s /q node_modules\\.prisma');
  console.log('  4) Run:');
  console.log('     npx prisma generate');
  console.log('\nIf you use an antivirus, add the repo folder to exclusions.');
  console.log('\nContinuing install anyway (exit 0).');
  process.exit(0);
}

process.exit(lastCode);
