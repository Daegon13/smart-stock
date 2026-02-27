# Deploy en Vercel (Next.js + Prisma + Postgres)

## 0) Aplicar este patch
1) Copiá los archivos del zip dentro de la raíz del repo.
2) Ejecutá:

```bash
node scripts/apply-deploy-patch.mjs
```

---

## 1) Base de datos (recomendado)
### Opción A: Vercel Postgres
En Vercel: **Storage → Postgres → Create → Connect** al proyecto.

Eso te crea `DATABASE_URL` automáticamente.

### Opción B: Neon / Supabase
Copiá tu connection string en `DATABASE_URL`.
> Si tu proveedor requiere SSL, agregá `?sslmode=require` si no viene.

---

## 2) Variables de entorno en Vercel
Project → **Settings → Environment Variables**:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (opcional)
- `SEED_DEMO` (opcional, `true` para cargar demo al deploy)

### Recomendado: Beta gate (para no dejar el panel abierto)

- `BETA_PASSWORD` — clave para entrar al panel.
- `BETA_SECRET` — secreto HMAC para firmar el cookie (cualquier string largo).

### Seguridad demo

- `ALLOW_DEMO_SEED=true` (solo si querés habilitar el endpoint `/api/demo/seed` en producción)

---

## 3) Build settings
Project → **Settings → Build & Development Settings**:

- Install Command: `npm install`
- Build Command: `npm run vercel-build`
- Output Directory: `.next`

---

## 4) Deploy
Conectá el repo a Vercel (GitHub) y deploy automático.

---

## 5) Desarrollo local con Postgres (paridad con producción)
### Levantar DB con Docker
```bash
docker compose up -d
```

### .env local
Copiá `.env.example` a `.env` y dejá `DATABASE_URL` como está.

### Correr
```bash
npm install
npm run dev:pg
```

---

## Nota sobre `db push`
Para MVP va perfecto. Para clientes reales: migraciones con `prisma migrate`.

### Migraciones (cuando cambia Prisma)

Si aplicás un patch que toca `prisma/schema.prisma`, corré migraciones antes de desplegar:

Local:
```bash
npx prisma migrate dev --name <nombre>
```

Producción (Vercel):
```bash
npx prisma migrate deploy
```

---

## 6) Setup de Auth (signin en Production)

### Variables recomendadas

- **Vercel Production**: `AUTH_LOGIN_ENABLED=true` (recomendado, sin bypass).
- **Vercel Preview / local**: `AUTH_LOGIN_ENABLED=false` si querés bypass de login para iterar.

> El bypass solo aplica fuera de Vercel Production.

### Inicializar auth en producción

1. Configurá `DATABASE_URL` y `DIRECT_URL`.
2. El build de Vercel ahora corre migraciones automáticamente con:

```bash
npm run db:migrate:deploy
```

3. Configurá estas variables para bootstrap admin:
   - `AUTH_BOOTSTRAP_ENABLED=true`
   - `AUTH_BOOTSTRAP_EMAIL=<tu-email-admin>`
   - `AUTH_BOOTSTRAP_PASSWORD=<tu-password-admin>`
   - `AUTH_BOOTSTRAP_NAME` (opcional, default: `Admin`)
4. Hacé un redeploy (una vez).
5. (Opcional) Dejá `AUTH_BOOTSTRAP_ENABLED=false` para evitar re-ejecuciones en deploys siguientes.

### Si aparece “Application error … Digest …” en `/signin`

1. Revisá **Runtime Logs** del deploy fallido.
2. Confirmá que `prisma migrate deploy` se ejecutó sin errores.
3. Confirmá que existe al menos 1 usuario (`AUTH_BOOTSTRAP_*` + bootstrap admin).
4. En caso de DB no inicializada, `/signin` debe redirigir con error legible para guiar la corrección.
