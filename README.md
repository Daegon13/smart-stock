# Patch 19 — Fix Vercel build (reviewDays -> coverageDays)

## Qué arregla
- El deploy en Vercel se caía por un error de TypeScript:
  `reviewDays` no existe en el type `StockAlgoOptions`.
- `computeSuggestions()` usa `coverageDays` (días a cubrir hasta la próxima reposición).

## Cómo aplicar
Copiá y reemplazá este archivo en tu repo:

- `app/api/ai/assistant/route.ts`

Luego:

```bash
npm install
npm run build
```

Y reintentá el deploy en Vercel.
