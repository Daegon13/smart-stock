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
