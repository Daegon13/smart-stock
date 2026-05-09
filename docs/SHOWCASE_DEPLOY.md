# Smart Stock — Showcase deploy guide

Guía breve para publicar Smart Stock como demo pública de portfolio sin cerrar el camino a SaaS real.

## Objetivo del entorno público

El deploy público debe permitir navegar la demo sin login, usando datos ficticios estables y bloqueando mutaciones peligrosas sobre la base compartida.

Configuración esperada:

- Landing pública clara en `/`.
- Panel navegable desde `/today` sin login.
- Dataset demo cargado con `npm run db:seed:showcase`.
- APIs de escritura bloqueadas cuando `SHOWCASE_READONLY=true`.
- Auth real preservada detrás de flags para retomarla después.

## Env vars necesarias

### Base de datos

```env
DATABASE_URL=<postgres runtime/pooling url>
DIRECT_URL=<postgres direct/non-pooling url>
```

`DATABASE_URL` es usada por la app en runtime y build. `DIRECT_URL` queda disponible para operaciones directas de Prisma si el proveedor separa conexiones pooling y directas.

### Showcase público recomendado para Vercel Preview/Public Showcase

```env
APP_VERSION=showcase
NEXT_PUBLIC_SITE_URL=https://<tu-dominio-publico>
NEXT_PUBLIC_CONTACT_URL=mailto:<tu-email-publico>?subject=Implementaci%C3%B3n%20Smart%20Stock
SHOWCASE_MODE=true
NEXT_PUBLIC_SHOWCASE_MODE=true
SHOWCASE_READONLY=true
NEXT_PUBLIC_SHOWCASE_READONLY=true
AUTH_LOGIN_ENABLED=false
ALLOW_DEMO_NO_AUTH=false
ALLOW_DEMO_SEED=false
SEED_DEMO=false
DEMO_STORE_ID=<id estable de Minimarket Demo, opcional pero recomendado>
OPENAI_API_KEY=
NEXT_PUBLIC_SHOW_DEV_BANNERS=false
```

Notas:

- `NEXT_PUBLIC_SITE_URL` define la URL canónica usada por metadata/OpenGraph.
- `NEXT_PUBLIC_CONTACT_URL` define el CTA comercial público; puede ser `mailto:`, portfolio, LinkedIn o formulario.
- `SHOWCASE_MODE=true` es el switch server-side que habilita navegación pública sin login.
- `NEXT_PUBLIC_SHOWCASE_MODE=true` solo expone el estado al cliente para mostrar banner/copy de demo.
- `SHOWCASE_READONLY=true` bloquea mutaciones desde middleware/API.
- `NEXT_PUBLIC_SHOWCASE_READONLY=true` permite que la UI diga explícitamente que la demo es solo lectura.
- `AUTH_LOGIN_ENABLED=false` está permitido en público solo porque `SHOWCASE_MODE=true` deja claro que no es SaaS operativo.
- `ALLOW_DEMO_SEED=false` evita que un endpoint de seed quede abierto en producción.
- `DEMO_STORE_ID` evita ambigüedad si la DB tiene más de un local demo.

### Build command recomendado

En Vercel usar:

```bash
npm run vercel-build
```

El script genera Prisma y compila Next.js sin ejecutar seed automático.

## Cómo cargar el seed showcase

El seed público no debe depender de que un visitante toque un botón en la UI. Cargalo como paso operativo controlado con `npm run db:seed:showcase`. Ese comando usa `scripts/seed-showcase.mjs` como launcher y carga `scripts/seed-showcase.ts` con `ts-node` en modo CommonJS para evitar problemas de ejecución de archivos `.ts` en entornos ESM.

### Opción local contra la DB configurada

1. Configurá `DATABASE_URL` apuntando a la DB del showcase.
2. Ejecutá:

```bash
npm run db:seed:showcase
```

El seed requiere `DATABASE_URL` apuntando a una base de datos preparada para demo. Es idempotente: crea o reutiliza la organización `showcase-org`, la franquicia `Showcase Franchise` y el local `Minimarket Demo`, además de catálogo, proveedores, movimientos y datos de muestra.

### Después del seed

1. Identificá el `id` del local demo si necesitás fijarlo.
2. Seteá `DEMO_STORE_ID=<id>` en Vercel.
3. Redeploy para que las env vars queden aplicadas.
4. Validá navegación:
   - `/`
   - `/today`
   - `/stock`
   - `/products`
   - `/orders`
   - `/import`

## Checklist de seguridad para demo pública

Antes de compartir el link:

- [ ] `SHOWCASE_MODE=true`.
- [ ] `SHOWCASE_READONLY=true`.
- [ ] `NEXT_PUBLIC_SHOWCASE_MODE=true`.
- [ ] `NEXT_PUBLIC_SHOWCASE_READONLY=true`.
- [ ] `AUTH_LOGIN_ENABLED=false` solo en este entorno showcase.
- [ ] `ALLOW_DEMO_SEED=false`.
- [ ] `SEED_DEMO=false`.
- [ ] La DB no contiene datos reales de clientes.
- [ ] `POST /api/products` responde 403 en modo read-only.
- [ ] `POST /api/movements` responde 403 en modo read-only.
- [ ] El banner del panel indica “Demo pública — modo solo lectura”.

## Cómo volver a modo auth real / beta privada

Para retomar el camino SaaS, no borres flags ni código showcase: cambiá el entorno.

### Env vars para beta privada / auth real

```env
SHOWCASE_MODE=false
NEXT_PUBLIC_SHOWCASE_MODE=false
SHOWCASE_READONLY=false
NEXT_PUBLIC_SHOWCASE_READONLY=false
AUTH_LOGIN_ENABLED=true
BETA_PASSWORD=<password fuerte si se usa beta gate>
BETA_SECRET=<secreto largo>
ALLOW_DEMO_NO_AUTH=false
ALLOW_DEMO_SEED=false
SEED_DEMO=false
```

### Pasos recomendados

1. Desactivar `SHOWCASE_MODE` y redeployar.
2. Activar `AUTH_LOGIN_ENABLED=true`.
3. Confirmar que las migraciones Prisma de auth/multi-tenant están aplicadas.
4. Crear o validar el owner inicial por un flujo seguro, no por endpoint público.
5. Revisar que todas las APIs resuelvan `storeId` desde sesión/membership, no desde input confiado del cliente.
6. Validar RBAC server-side para crear, editar, borrar, importar y recibir pedidos.
7. Recién después presentar el entorno como beta privada o SaaS operativo.

## Riesgos conocidos

- El showcase público es deliberadamente read-only; no prueba onboarding real de usuarios.
- La auth por email está pausada para no mezclar deuda de SaaS con portfolio público.
- Si se cambia `SHOWCASE_READONLY=false` en una DB compartida, visitantes podrían ensuciar los datos de muestra.
- Cambios de env vars en Vercel requieren redeploy.

## Comandos útiles

```bash
npm run typecheck
npm run lint
npm run vercel-build
npm run db:seed:showcase
```
