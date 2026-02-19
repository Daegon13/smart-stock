# Deploy en Vercel + Supabase (Prisma)

## Por qué se te colgó el build
Si `DATABASE_URL` apunta al **pooler** de Supabase (host `*.pooler.supabase.com` puerto `6543`), los comandos de Prisma que intentan **crear/alterar esquema** (`prisma db push`, migraciones) pueden quedar colgados o fallar.

La solución correcta es:
- **Runtime (app):** puede usar `DATABASE_URL` (directo o pooler)
- **Prisma CLI (db push / migrate):** usar SIEMPRE conexión **directa (no pooling)** vía `DIRECT_URL`.

## Variables de entorno (Vercel)
En *Project → Settings → Environment Variables*:

- `DATABASE_URL` = tu URL Postgres **válida** (si querés simple, usá la *Direct connection* de Supabase, puerto 5432)
- `DIRECT_URL` = la URL **directa/no pooling** (puerto 5432)

Si estás usando la integración de Supabase en Vercel:
- `DIRECT_URL` = valor de `POSTGRES_URL_NON_POOLING`
- `DATABASE_URL` = (opcional) `POSTGRES_PRISMA_URL` o `POSTGRES_URL` (si usás pooler) o también `POSTGRES_URL_NON_POOLING` (si querés cero drama)

> Importante: las keys tipo `sb_publishable_...` **NO** son database URLs.

## 1) Aplicar el patch
Desde la raíz del repo:

```bash
node scripts/apply-deploy-patch-v2.mjs
node scripts/use-postgres.mjs
```

Commit + push.

## 2) Preparar la base (una sola vez)
**Opción A (recomendada para MVP):** corrés esto en tu PC, apuntando a Supabase.

1) En tu `.env` local poné:

```env
DATABASE_URL="postgresql://...@db.<project>.supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://...@db.<project>.supabase.co:5432/postgres?sslmode=require"
SEED_DEMO="true"
```

2) Luego:

```bash
npm install
npm run db:deploy
```

Eso crea tablas + datos demo.

## 3) Build en Vercel
Dejá el *Build Command* como:

```
npm run vercel-build
```

Con este patch, el build no toca la DB (no se cuelga 45 minutos).

## Si igual querés usar el pooler en runtime
Podés dejar `DATABASE_URL` apuntando al pooler, y `DIRECT_URL` al puerto 5432.
Si ves errores raros con pooler + Prisma (prepared statements), lo más estable para MVP es usar **directo (5432)** para ambos.
