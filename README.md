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
- `app/(app)` -> dashboard / productos / movimientos / stock inteligente / asistente
- `app/api` -> API (productos + movimientos + sugerencias + IA)
- `prisma` -> esquema + db

## Deploy recomendado
**Vercel** (soporta Next.js fullstack). GitHub es el repo.

### Variables de entorno en Vercel
- `DATABASE_URL` (Postgres recomendado para producción)
- `OPENAI_API_KEY` (opcional, habilita el Asistente IA)
- `OPENAI_MODEL` (opcional, default: `gpt-5`)

## Funciones incluidas en este MVP
- CRUD de productos
- Movimientos (entrada/salida/ajuste) con actualización de stock
- "Stock inteligente": sugerencia de reposición + borrador de mensaje a proveedor
- "Asistente IA": pregunta-respuesta basada en tus datos (con fallback si no hay API key)

## IA (opcional)
Si agregás `OPENAI_API_KEY` en `.env`, se habilita el endpoint `/api/ai/assistant` y la pantalla **Asistente IA**.
Si no, funciona en “Modo básico” con respuestas automáticas.

## Nota de MVP
Para que el cálculo sea bueno: registrá **Salidas** (ventas) con frecuencia.
