#!/usr/bin/env node
/**
 * Switch Prisma datasource to PostgreSQL.
 * Adds DIRECT_URL support for Supabase/Vercel (non-pooling direct connection),
 * which Prisma uses for schema push/migrations.
 */
import fs from 'node:fs';
import path from 'node:path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

if (!fs.existsSync(schemaPath)) {
  console.error('❌ prisma/schema.prisma not found. Run this from repo root.');
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, 'utf8');

const datasourceRegex = /datasource\s+db\s*\{[\s\S]*?\n\}/m;

const newDatasource = `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  // Use a *direct/non-pooling* connection for Prisma CLI operations (db push/migrate).
  // In Vercel + Supabase integration, you can set DIRECT_URL = POSTGRES_URL_NON_POOLING.
  directUrl = env("DIRECT_URL")
}`;

if (datasourceRegex.test(schema)) {
  schema = schema.replace(datasourceRegex, newDatasource);
} else {
  // If datasource block is missing, prepend it.
  schema = `${newDatasource}\n\n${schema}`;
}

// Ensure generator client exists (some repos keep it, but this is safe)
const generatorRegex = /generator\s+client\s*\{[\s\S]*?\n\}/m;
if (!generatorRegex.test(schema)) {
  schema = `generator client {\n  provider = \"prisma-client-js\"\n}\n\n${schema}`;
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('✅ Updated Prisma datasource to PostgreSQL (with DIRECT_URL support).');
