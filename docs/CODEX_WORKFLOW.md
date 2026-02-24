# Flujo de trabajo con Codex (recomendado)

Objetivo: usar Codex como acelerador sin romper el repo.

## Prompt inicial sugerido
Pegale esto al iniciar una sesión:

```text
Leé AGENTS.md y docs/PATCH_PLAN.md.
Ejecutá `npm run vercel-build`.
Si falla: arreglá con el patch mínimo y volvé a correr el build.
Entregá: resumen, archivos tocados y el diff.
```

## Regla de oro
- 1 PR = 1 objetivo. Nada de “refactor de toda la app” junto con un bugfix.

## Tareas por tipo de agente (si trabajás en paralelo)
- Build Sheriff: solo build/TS/Next.
- Prisma/DB: schema, migraciones, undo import, constraints.
- UI/Onboarding: páginas, copy, flows.
- IA/Costos: rate limit, logging, safety.

Cada agente trabaja en su rama y abre PR chico. CI decide.

## Checklist antes de pedirle a Codex que termine
- `npm run vercel-build` pasa
- Si tocó Prisma: `npx prisma format` y migración commiteada si aplica
- No dejó endpoints demo abiertos en prod
- No introdujo dependencias sin motivo

## Evitar conflictos con `main` antes de abrir PR
- Sincronizá tu rama antes del patch final: `git fetch origin && git rebase origin/main` (o merge de `main` si tu flujo lo requiere).
- Si hay conflictos, resolvelos en la rama del patch y recién después corré los checks.
- Corré `npm run vercel-build` (el type-check de TypeScript valida casing consistente de imports para evitar fallos Linux vs Windows).
- Confirmá que no haya cambios inesperados: `git status` limpio salvo archivos del patch.
