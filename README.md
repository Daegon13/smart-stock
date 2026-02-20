# Patch 23 — Fix TS error en demo seed (suppliers any[])

## Qué arregla
En `app/api/demo/seed/route.ts` TypeScript falla en build porque `const suppliers = []` se infiere como `any[]` (y en modo estricto Next falla el build).

## Cómo aplicar
1) Descomprimí el zip en la raíz del repo.
2) Ejecutá:

```bash
node scripts/apply-patch-23.mjs
```

3) Corré el build que usás para Vercel:

```bash
npm run vercel-build
```

Si compila, commiteá y pusheá.
