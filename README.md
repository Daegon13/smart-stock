# Stock Inteligente (MVP)

Starter técnico para el MVP de **Inventario + Compras sugeridas** (minimarkets/autoservicios).

## Requisitos
- Node.js 18+

## Instalación (local)
```bash
# 1) instalar deps
npm install

# 2) configurar env
cp .env.example .env

# 3) crear db + seed
npm run setup

# 4) levantar
npm run dev
```
Abrí: http://localhost:3000

## Estructura
- `app/(marketing)` -> landing
- `app/(app)` -> dashboard / productos
- `app/api` -> API (CRUD productos)
- `prisma` -> esquema + db

## Deploy recomendado
**Vercel** (soporta Next.js fullstack). GitHub es el repo.

### Variables de entorno en Vercel
- `DATABASE_URL` (Postgres recomendado para producción)

## Próximo sprint (en el código)
- Movimientos de inventario (IN/OUT/ADJUST) + historial
- Alertas de stock bajo
- Sugerencia de compra (primera heurística)
