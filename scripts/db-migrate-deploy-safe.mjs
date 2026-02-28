#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return {
    command: `${command} ${args.join(' ')}`,
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function printOutput({ stdout, stderr }) {
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
}

const steps = [
  ['node', ['scripts/use-postgres.mjs']],
  ['npx', ['prisma', 'generate']],
];

for (const [command, args] of steps) {
  const result = run(command, args);
  printOutput(result);

  if (result.status !== 0) {
    console.error(`❌ Failed: ${result.command}`);
    process.exit(result.status);
  }
}

const migrateResult = run('npx', ['prisma', 'migrate', 'deploy']);
printOutput(migrateResult);

if (migrateResult.status === 0) {
  process.exit(0);
}

const combinedOutput = `${migrateResult.stdout}\n${migrateResult.stderr}`;
const isP3005 =
  combinedOutput.includes('P3005') ||
  combinedOutput.includes('The database schema is not empty');

if (!isP3005) {
  console.error('❌ prisma migrate deploy failed with a non-P3005 error.');
  process.exit(migrateResult.status || 1);
}

console.warn(
  '⚠️ prisma migrate deploy failed with P3005 (schema not empty). Falling back to prisma db push for baseline compatibility.',
);

const dbPushResult = run('npx', ['prisma', 'db', 'push']);
printOutput(dbPushResult);

if (dbPushResult.status !== 0) {
  console.error('❌ Fallback prisma db push failed.');
  process.exit(dbPushResult.status || 1);
}

console.log('✅ Fallback prisma db push completed successfully.');
