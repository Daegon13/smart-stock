# Patch 29 – StockIntelligence: chosen incluye productId

Corrige el error de TypeScript en build:
- `Property 'productId' does not exist on type ...`

Cambio:
- En `components/StockIntelligence.tsx`, el array `chosen` ahora mantiene:
  - `productId`
  - `suggestedQty`
  - y conserva `qty` para mensajes/CSV.

Aplicación:
```bash
node scripts/apply-patch-29.mjs
npm run vercel-build
```
