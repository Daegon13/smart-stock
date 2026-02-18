# Patch 16 — Vercel + Postgres (Prisma) + Seed opcional

Este patch NO pisa tu schema completo.
En su lugar agrega scripts que reescriben SOLO el bloque `datasource db { ... }` a Postgres.

Incluye:
- scripts/use-postgres.mjs
- scripts/seed-maybe.mjs
- scripts/apply-deploy-patch.mjs
- docker-compose.yml
- .env.example
- DEPLOY_VERCEL.md
