# Runbook (levantar, buildear, desplegar)

## Variables de entorno (mínimas)
En local (`.env`) y en Vercel (Project Settings → Environment Variables):

### Base de datos (Prisma + Postgres)
- `DATABASE_URL` = URL Postgres (runtime)
- `DIRECT_URL` = URL Postgres directa/no-pooling (para Prisma CLI en CI/build)

Si usás Supabase, mirá también: `DEPLOY-VERCEL-SUPABASE.md`.

### IA (opcional)
- `OPENAI_API_KEY` = key para habilitar IA real. Si falta, queda fallback.


### Login simple del panel (recomendado)
- `AUTH_EMAIL` = email habilitado para entrar al panel
- `AUTH_SECRET` = secreto largo para firmar cookie `ss_auth`
- `AUTH_PASSWORD` = contraseña en texto plano (solo para pruebas internas)
- `AUTH_PASSWORD_HASH` = hash tipo `s2$...` (preferido sobre `AUTH_PASSWORD`)
- `AUTH_SESSION_MAX_AGE_SECONDS` = duración de sesión `ss_auth` en segundos (opcional; default 30 días)
- `AUTH_LOGIN_MAX_ATTEMPTS` = intentos máximos de login por IP dentro de la ventana (opcional; default 10)
- `AUTH_LOGIN_WINDOW_SECONDS` = ventana de rate-limit de login por IP en segundos (opcional; default 60)

> Si `AUTH_EMAIL` + `AUTH_SECRET` están configurados, el middleware usa login con email/contraseña (`/login`).
> Si no, mantiene fallback al beta gate histórico (`BETA_PASSWORD` + `BETA_SECRET`).

### Beta gate (opcional pero recomendado para público)
- `BETA_PASSWORD` = password de acceso a la beta
- `BETA_SECRET` = secreto largo para firmar cookie
- `ALLOW_DEMO_SEED` = "true" si querés permitir seed demo en producción

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
