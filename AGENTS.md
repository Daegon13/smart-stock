# AGENTS.md — Smart Stock (Marin)

## Objetivo
MVP de stock inteligente (Next.js 14 + Prisma/Postgres + Vercel).
Prioridad: estabilidad de build/deploy, seguridad básica (beta gate), import confiable y reversible.

## Reglas de trabajo
- Cambios pequeños por PR (1 objetivo).
- Siempre correr: `npm run vercel-build` antes de terminar.
- No introduzcas nuevas librerías si no es imprescindible.
- Respeta el plan de parches (ver docs/PATCH_PLAN.md).
- Si tocás Prisma: asegurar relaciones bidireccionales, correr `prisma format`, y crear migración cuando aplique.

## Comandos
- Build prod: `npm run vercel-build`
- Prisma: `npx prisma format`, `npx prisma migrate dev`, `npx prisma migrate deploy`

## Entorno
- Vercel + Postgres
- Windows local (case-insensitive), Vercel Linux (case-sensitive): ojo con imports.