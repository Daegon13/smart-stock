# Runbook (levantar, buildear, desplegar)

## Variables de entorno (mínimas)
En local (`.env`) y en Vercel (Project Settings → Environment Variables):

### Base de datos (Prisma + Postgres)
- `DATABASE_URL` = URL Postgres (runtime)
- `DIRECT_URL` = URL Postgres directa/no-pooling (para Prisma CLI en CI/build)

Si usás Supabase, mirá también: `DEPLOY-VERCEL-SUPABASE.md`.

### IA (opcional)
- `OPENAI_API_KEY` = key para habilitar IA real. Si falta, queda fallback.

### Beta gate (opcional pero recomendado para público)
- `BETA_PASSWORD` = password de acceso a la beta
- `BETA_SECRET` = secreto largo para firmar cookie
- `ALLOW_DEMO_SEED` = "true" si querés permitir seed demo en producción
- `UNDO_IMPORT_ENABLED` = "false" para deshabilitar endpoint/botón de deshacer imports

### Seed (solo local / controlado)
- `SEED_DEMO` = "true" para insertar datos demo al preparar DB

## Comandos útiles

### Desarrollo local
```bash
npm install
npm run dev
```

### Build producción (igual que Vercel)
```bash
npm run vercel-build
```

### Prisma (cuando cambia schema)
Formato:
```bash
npx prisma format
```

Crear migración (local):
```bash
npx prisma migrate dev --name <nombre>
```

Aplicar migraciones en producción (Vercel/servidor):
```bash
npx prisma migrate deploy
```

## Deploy en Vercel (pasos)
1) Configurá env vars (DATABASE_URL y DIRECT_URL sí o sí).
2) Build command: `npm run vercel-build`.
3) Si hay migraciones nuevas:
   - aplicá `prisma migrate deploy` contra la DB de prod (antes de usar nuevas columnas en runtime).

## Troubleshooting rápido

### 1) useSearchParams sin Suspense
Síntoma:
- `useSearchParams() should be wrapped in a suspense boundary at page "/assistant"`
Solución:
- envolver el componente que usa `useSearchParams` en `<Suspense>` o hacer el layout/página dinámica.

### 2) Prisma P1012 “missing opposite relation field”
Síntoma:
- relación declarada en un modelo pero falta el campo inverso.
Solución:
- agregar el field inverso + (si corresponde) nombre de relación `@relation("...")`.
- correr `npx prisma format` y migración si aplica.

### 3) Diferencias local (Windows) vs Vercel (Linux)
- Imports con mayúsculas/minúsculas distintas.
- Rutas/archivos renombrados.
Solución:
- normalizar nombres de archivos y imports, y confiar en CI Linux.

### 4) Prisma generate falla en postinstall
- Si falla `postinstall`, Vercel corta antes de build.
Solución:
- arreglar schema, validar relaciones, y mantener `DIRECT_URL` correcto.


## Cierre de Tren A (P32 + P35) — checklist operativo
- [x] Beta gate activo para rutas del panel y APIs protegidas.
- [x] Fail-closed en producción si faltan `BETA_PASSWORD`/`BETA_SECRET`.
- [x] `/api/health` público para checks operativos.
- [x] Endpoints demo sensibles bloqueados en producción por default (`ALLOW_DEMO_SEED` requerido).
- [x] `npm run vercel-build` pasa en Linux/CI.
- [ ] Branch protection en GitHub con check requerido `CI (vercel-build)` (paso manual fuera del repo).


## Auth producción multi-tenant (nuevo)
Variables nuevas:
- `NEXTAUTH_URL` (reservada para migración futura a Auth.js)
- `NEXTAUTH_SECRET` (reservada para migración futura a Auth.js)
- `ALLOW_DEMO_NO_AUTH` (default recomendado: `false`; solo `true` en dev/demo)
- `ALLOW_DEMO_SEED` (default recomendado: `false` en prod)
- `ALLOW_AUTH_BOOTSTRAP` (default `false`; solo dev para crear owner inicial por API)
- `AUTH_LOGIN_ENABLED` (default `true`; si `false`, bypass de login habilitado en local y en Vercel Preview; en Vercel Production se mantiene login)

Migración a ejecutar en producción:
1. `npx prisma migrate deploy`
2. `node scripts/backfill-org-franchise.mjs`

Notas:
- El local activo se resuelve por cookie `ss_active_store` y se valida contra membresías.
- Nunca confiar en `storeId` enviado por el cliente.


IMPORTANTE: al cambiar env vars en Vercel, hacé redeploy para que tomen efecto.
- Si `AUTH_LOGIN_ENABLED=false` en Preview y la migración de auth no está aplicada todavía, el sistema entra en modo bypass sin consultar `Session` para evitar error 500.

