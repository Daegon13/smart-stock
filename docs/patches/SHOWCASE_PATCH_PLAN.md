# Smart Stock — Plan de patches para dejarlo público sin bloquear el futuro de auth

## Diagnóstico del estado actual

Objetivo inmediato: dejar Smart Stock presentable como muestra pública de capacidad técnica.

Decisión estratégica: **no completar ahora la autenticación por correo**. Está en una fase intermedia y, para una demo pública, terminarla ahora consume energía en un problema que no mejora la percepción pública del producto. La vía óptima es congelarla detrás de flags, recuperar build/deploy verde y crear un modo showcase público, seguro y reversible.

Hallazgos principales en el repo:

1. Hay dos conceptos mezclados:
   - Beta gate simple por password en `/login`.
   - Auth por email/password en `/signin` con sesiones DB.

2. El sistema de auth real ya tiene piezas avanzadas:
   - `User`, `Session`, `Organization`, `Franchise`, `OrgMember`, `StoreMember` en Prisma.
   - Helpers server-side en `lib/auth.ts`.
   - Selección de local activo con cookie `ss_active_store`.

3. La app quedó en estado intermedio:
   - `app/api/products/route.ts`, `app/api/movements/route.ts` y `app/api/categories/route.ts` importan `withActiveStore` y `canMutate` desde `lib/apiAuth.ts`.
   - Pero `lib/apiAuth.ts` actualmente no exporta esas funciones.
   - Esto debe ser el primer hotfix porque puede romper build/deploy.

4. `lib/authFlags.ts` y `lib/apiAuth.ts` duplican conceptos de flags con comportamientos distintos.
   - `authFlags.ts`: `AUTH_LOGIN_ENABLED=false` permite bypass local y Vercel Preview, pero no Vercel Production.
   - `apiAuth.ts`: comenta bypass en todos los entornos, pero solo exporta flags incompletos.
   - Hay que unificar esto para no tener bugs fantasma.

5. Para demo pública no conviene abrir escritura total sobre una DB compartida.
   - Lo ideal: demo pública en modo read-only o con mutaciones bloqueadas.
   - Para prospectos/clientes internos: beta privada con escritura habilitada.

---

## Estrategia recomendada

Crear dos modos claros:

### 1. Public Showcase Mode
Para portafolio público.

Env vars sugeridas:

```env
NEXT_PUBLIC_SHOWCASE_MODE=true
SHOWCASE_MODE=true
SHOWCASE_READONLY=true
AUTH_LOGIN_ENABLED=false
ALLOW_DEMO_SEED=false
```

Características:

- Entra directo a `/today` o `/dashboard` sin login.
- Usa una tienda demo estable.
- Muestra datos reales de ejemplo.
- Bloquea mutaciones peligrosas en APIs.
- Oculta pantallas de login/select-store innecesarias.
- Muestra un banner elegante: “Demo pública — datos de ejemplo”.

### 2. Private Beta / Future SaaS Mode
Para retomar auth y clientes reales.

Env vars sugeridas:

```env
AUTH_LOGIN_ENABLED=true
SHOWCASE_MODE=false
BETA_PASSWORD=<password>
BETA_SECRET=<secret largo>
```

Características:

- Login real o beta gate.
- Sesiones DB.
- Multi-tenant.
- Store activo por usuario.
- Mutaciones habilitadas según rol.

---

# Orden de patches

## PATCH 00 — Build Sheriff: recuperar compilación verde

### Objetivo
Dejar el repo en un estado confiable antes de tocar producto.

### Cambios

1. Ejecutar:

```bash
npm ci
npm run vercel-build
```

2. Si falla por `lib/apiAuth.ts`, aplicar hotfix mínimo:
   - Exportar `withActiveStore`.
   - Exportar `canMutate`.
   - Reusar `getOrCreateDefaultStore()` temporalmente.
   - No rediseñar auth completa en este patch.

3. Confirmar que no hay imports rotos ni errores TS.

### Archivos probables

- `lib/apiAuth.ts`
- `app/api/products/route.ts`
- `app/api/movements/route.ts`
- `app/api/categories/route.ts`

### Prompt para Codex

```text
Actuá como Build Sheriff del repo Smart Stock.

Objetivo del patch: recuperar build verde con el cambio mínimo posible.

Contexto:
- Varias APIs importan `withActiveStore` y `canMutate` desde `lib/apiAuth.ts`.
- Actualmente `lib/apiAuth.ts` no exporta esas funciones.
- No quiero terminar la autenticación real todavía.
- No quiero refactors grandes.

Tareas:
1. Ejecutá `npm run vercel-build`.
2. Si falla, arreglá solo lo mínimo para que compile.
3. Implementá en `lib/apiAuth.ts` exports compatibles:
   - `withActiveStore(handler)`
   - `canMutate(role)`
4. `withActiveStore` debe resolver el store usando `getOrCreateDefaultStore()` y devolver `{ storeId, role }`.
5. El rol puede ser `owner` por defecto por ahora, salvo que haya cookie `ss_role` disponible de forma segura.
6. No cambies Prisma salvo que el build lo exija.
7. No introduzcas librerías nuevas.
8. Al final corré `npm run vercel-build`.

Entregá:
- Resumen del problema encontrado.
- Archivos tocados.
- Diff.
- Resultado del build.
```

### Criterio de aceptación

- `npm run vercel-build` pasa.
- No se toca la arquitectura completa de auth.
- No se rompen rutas existentes.

---

## PATCH 01 — Unificar flags de auth/demo/showcase

### Objetivo
Eliminar ambigüedad entre `authFlags.ts`, `apiAuth.ts`, beta gate y modo demo.

### Cambios

Crear o consolidar un archivo de flags, recomendado:

- `lib/runtimeFlags.ts`

Funciones sugeridas:

```ts
export function isLoginSystemEnabled(): boolean
export function isPublicShowcaseMode(): boolean
export function isShowcaseReadonly(): boolean
export function isAuthBypassAllowed(): boolean
export function isDemoSeedAllowed(): boolean
```

Reglas sugeridas:

- `SHOWCASE_MODE=true` habilita demo pública.
- `SHOWCASE_READONLY=true` bloquea mutaciones.
- `AUTH_LOGIN_ENABLED=false` no debe significar automáticamente “abrir producción” salvo si `SHOWCASE_MODE=true`.
- `ALLOW_DEMO_SEED=true` debe seguir siendo explícito y excepcional.

### Archivos probables

- `lib/runtimeFlags.ts` nuevo
- `lib/authFlags.ts`
- `lib/apiAuth.ts`
- `lib/demoGate.ts`
- `middleware.ts`
- `docs/RUNBOOK.md`

### Prompt para Codex

```text
Actuá como arquitecto pragmático de Smart Stock.

Objetivo del patch: unificar flags de auth/demo/showcase sin terminar la auth real.

Problema:
- `lib/authFlags.ts` y `lib/apiAuth.ts` duplican lógica y contradicen el comportamiento esperado.
- Necesitamos un modo público de showcase y conservar la vía para auth real futura.

Tareas:
1. Crear `lib/runtimeFlags.ts` con helpers puros para leer env vars:
   - `isLoginSystemEnabled`
   - `isPublicShowcaseMode`
   - `isShowcaseReadonly`
   - `isAuthBypassAllowed`
   - `isDemoSeedAllowed`
2. Migrar `authFlags.ts`, `apiAuth.ts`, `demoGate.ts` y `middleware.ts` para usar estos helpers.
3. Mantener compatibilidad con env vars existentes:
   - `AUTH_LOGIN_ENABLED`
   - `ALLOW_DEMO_NO_AUTH`
   - `ALLOW_DEMO_SEED`
   - `BETA_PASSWORD`
   - `BETA_SECRET`
4. Agregar env vars nuevas documentadas:
   - `SHOWCASE_MODE`
   - `SHOWCASE_READONLY`
   - `NEXT_PUBLIC_SHOWCASE_MODE`
5. No cambiar pantallas ni flujos todavía.
6. No agregar dependencias.
7. Correr `npm run vercel-build`.

Reglas:
- En producción, solo se bypass auth si `SHOWCASE_MODE=true`.
- Si `SHOWCASE_READONLY=true`, las APIs de escritura deben poder bloquearse en patches siguientes.
- Beta gate debe seguir funcionando cuando `SHOWCASE_MODE=false`.

Entregá resumen, archivos tocados, diff y resultado del build.
```

### Criterio de aceptación

- Hay una sola fuente mental de verdad para flags.
- La producción no queda accidentalmente abierta.
- El showcase público queda habilitable explícitamente.

### Implementación PATCH 01

- Fuente central de flags: `lib/runtimeFlags.ts`.
- Documentación de envs: `.env.example` y `docs/ENVIRONMENT.md`.
- Para showcase público read-only usar `SHOWCASE_MODE=true`, `NEXT_PUBLIC_SHOWCASE_MODE=true`, `SHOWCASE_READONLY=true`, `AUTH_LOGIN_ENABLED=false` y, si aplica, `DEMO_STORE_ID=<store estable>`.

---

## PATCH 02 — Modo público sin login y sin select-store

### Objetivo
Permitir que cualquier persona vea la demo pública sin quedar atrapada en `/signin`, `/login` o `/select-store`.

### Cambios

1. Modificar `middleware.ts`:
   - Si `SHOWCASE_MODE=true`, permitir rutas del panel.
   - Permitir `GET` de APIs necesarias para lectura.
   - Bloquear por middleware mutaciones públicas si `SHOWCASE_READONLY=true`.

2. Modificar `getOrCreateDefaultStore()`:
   - En showcase, resolver una tienda demo estable.
   - No depender de cookie `ss_active_store`.
   - Si no hay tienda, devolver error claro o crear solo fuera de producción.

3. Evitar redirecciones a `/select-store` en showcase.

### Archivos probables

- `middleware.ts`
- `lib/defaultStore.ts`
- `lib/auth.ts`
- `lib/apiAuth.ts`

### Prompt para Codex

```text
Actuá como arquitecto de producto para una demo pública de Smart Stock.

Objetivo del patch: habilitar `SHOWCASE_MODE=true` para que el panel sea navegable públicamente sin login ni selección de tienda.

Tareas:
1. En `middleware.ts`, si `SHOWCASE_MODE=true`:
   - permitir rutas de panel como `/today`, `/dashboard`, `/stock`, `/import`, `/orders`, `/products`, etc.
   - permitir APIs `GET` necesarias para lectura.
   - si `SHOWCASE_READONLY=true`, bloquear métodos no GET contra `/api/*` salvo `/api/health`.
2. En `lib/defaultStore.ts`, resolver el store demo estable en showcase:
   - buscar el primer store por `createdAt asc` o por nombre `Minimarket Demo`.
   - en producción no crear datos mágicamente si no existe; devolver error controlado.
   - en local sí puede crear `Demo Store` si no existe.
3. Evitar que showcase redirija a `/select-store`.
4. Mantener `AUTH_LOGIN_ENABLED=true` + beta/auth funcionando cuando `SHOWCASE_MODE=false`.
5. Correr `npm run vercel-build`.

No completes auth por correo todavía.
No agregues dependencias.
No hagas refactor global.
```

### Criterio de aceptación

Con env vars:

```env
SHOWCASE_MODE=true
SHOWCASE_READONLY=true
NEXT_PUBLIC_SHOWCASE_MODE=true
AUTH_LOGIN_ENABLED=false
```

Debe pasar:

- `/` carga.
- `/today` carga sin login.
- `/stock` carga sin login.
- `/products` carga sin login.
- `/signin` no interrumpe el uso público.
- `POST /api/products` responde 403 si `SHOWCASE_READONLY=true`.

---

## PATCH 03 — Seed showcase estable e idempotente

### Objetivo
La demo pública debe tener datos buenos siempre, sin depender de que alguien toque “cargar demo”.

### Cambios

Crear un seed específico para showcase:

- `scripts/seed-showcase.ts` o `scripts/seed-showcase.mjs`

Debe ser idempotente:

- Crear o reutilizar `Organization` con slug `showcase-org`.
- Crear o reutilizar `Franchise`.
- Crear o reutilizar `Store` llamado `Minimarket Demo`.
- Crear productos, proveedores, movimientos y tickets demo si faltan.
- No duplicar datos al correr dos veces.

Agregar scripts:

```json
"db:seed:showcase": "ts-node --transpile-only scripts/seed-showcase.ts"
```

### Dataset recomendado

El seed debe mostrar capacidades concretas:

- 35-50 productos.
- 6 proveedores.
- Productos críticos y otros OK.
- Movimientos de entrada/salida en los últimos 14-30 días.
- Algunas ventas importadas/tickets.
- Algunos unmatched para mostrar conciliación.
- Algunas órdenes de compra generadas o borradores.

### Prompt para Codex

```text
Actuá como data/product engineer para Smart Stock.

Objetivo del patch: crear un seed público estable para showcase.

Tareas:
1. Crear `scripts/seed-showcase.ts` idempotente.
2. El script debe crear/reutilizar:
   - Organization `showcase-org`
   - Franchise `Showcase Franchise`
   - Store `Minimarket Demo`
3. Cargar dataset demo rico:
   - 35 a 50 productos
   - 6 proveedores
   - movimientos IN/OUT/ADJUST de los últimos 14 a 30 días
   - productos con stock crítico, stock bajo y stock sano
   - algunos tickets/ticket lines si el schema lo permite sin mucho riesgo
   - opcional: 1 o 2 purchase orders/drafts
4. El script debe ser idempotente: correrlo dos veces no debe duplicar catálogo.
5. Agregar script en `package.json`: `db:seed:showcase`.
6. Documentar en `docs/RUNBOOK.md` cómo correrlo.
7. Correr:
   - `npx prisma format`
   - `npm run vercel-build`

No tocar login/auth real en este patch.
No usar endpoints HTTP para seed en producción.
```

### Criterio de aceptación

- `npm run db:seed:showcase` deja una demo visualmente rica.
- Correr dos veces no duplica productos/proveedores.
- `/today`, `/dashboard`, `/stock`, `/orders`, `/import` se ven vivos.

---

## PATCH 04 — Read-only UX para demo pública

### Objetivo
Que la demo pública no se sienta rota cuando el usuario intenta modificar algo.

### Cambios

1. Crear helper público:

```ts
isShowcaseReadonly()
```

2. Pasar estado a componentes relevantes.

3. En UI:
   - Deshabilitar botones de crear/editar/borrar/importar si `SHOWCASE_READONLY=true`.
   - Mostrar tooltip/copy amable:
     - “Demo pública: las acciones de escritura están desactivadas para mantener los datos limpios.”
   - Mantener botones de navegación y lectura activos.

4. En APIs:
   - Bloquear mutaciones aunque el botón se escape por consola.
   - Responder 403 con JSON claro.

### Componentes probables

- `components/ProductManager.tsx`
- `components/MovementManager.tsx`
- `components/CsvImportWizard.tsx`
- `components/XlsxImportWizard.tsx`
- `components/TicketImportWizard.tsx`
- `components/ImportBatchesCard.tsx`
- `components/StockIntelligence.tsx`
- `components/PurchaseOrderReceive.tsx`
- `components/RoleSwitcher.tsx`

### Prompt para Codex

```text
Actuá como UX engineer y backend hardening engineer.

Objetivo del patch: hacer que `SHOWCASE_READONLY=true` sea claro para el usuario y seguro a nivel API.

Tareas UI:
1. Detectar showcase público con `NEXT_PUBLIC_SHOWCASE_MODE=true`.
2. En componentes con escritura, deshabilitar acciones destructivas o persistentes:
   - crear producto
   - editar producto
   - borrar producto
   - movimientos manuales
   - importar CSV/XLSX/tickets
   - undo import
   - crear/recibir órdenes
   - cambiar rol demo
3. Mostrar un aviso elegante: “Demo pública: acciones de escritura desactivadas”.
4. No ocultar toda la funcionalidad; mostrar lo que haría el sistema.

Tareas API:
1. Si `SHOWCASE_READONLY=true`, responder 403 en métodos mutantes.
2. Mantener GET funcionando.
3. No romper beta privada cuando `SHOWCASE_READONLY=false`.

Correr `npm run vercel-build`.
```

### Criterio de aceptación

- La demo no se puede ensuciar desde UI.
- Tampoco se puede ensuciar desde fetch manual.
- La experiencia sigue mostrando valor.

---

## PATCH 05 — Pulido de presentación pública

### Objetivo
Que al abrir el link se entienda rápidamente que esto es una muestra seria de capacidad técnica.

### Cambios

1. Mejorar landing `/`:
   - Hero más fuerte.
   - CTA principal: “Ver demo pública”.
   - CTA secundario: “Ver recorrido técnico”.
   - Bloque “Qué demuestra técnicamente”.

2. Agregar banner superior en panel:
   - “Smart Stock — Demo pública con datos de ejemplo”.
   - “Desarrollado por MarinDev”.
   - Link a contacto/portfolio.

3. Agregar página o sección `/about-demo`:
   - Stack: Next.js, Prisma, PostgreSQL, Vercel.
   - Módulos: stock, importación, conciliación, reposición, pedidos, IA opcional.
   - Decisiones técnicas: multi-tenant preparado, auth en pausa por showcase, seed idempotente.

4. Mejorar metadatos:
   - title
   - description
   - OpenGraph básico

### Prompt para Codex

```text
Actuá como diseñador de producto y CRO engineer.

Objetivo del patch: pulir Smart Stock como demo pública de capacidad técnica para MarinDev.

Tareas:
1. Mejorar `app/(marketing)/page.tsx` con una landing más fuerte:
   - CTA principal a `/today`
   - CTA secundario a `/about-demo` si se crea
   - explicación clara del problema: stock, reposición, ventas importadas, pedidos por proveedor
2. Agregar una sección “Qué demuestra esta demo técnicamente”:
   - Next.js App Router
   - Prisma/Postgres
   - import CSV/XLSX
   - cálculo de reposición
   - multi-store preparado
   - auth futura separada por flags
3. Agregar banner discreto en `AppShell` cuando `NEXT_PUBLIC_SHOWCASE_MODE=true`.
4. El banner debe decir que es demo pública read-only si aplica.
5. Mejorar metadata en `app/layout.tsx`.
6. No cambiar lógica de negocio.
7. Correr `npm run vercel-build`.
```

### Criterio de aceptación

- Un visitante entiende qué es en menos de 10 segundos.
- La demo no parece abandonada ni “bloqueada por login”.
- La narrativa técnica queda explícita.

---

## PATCH 06 — Congelar auth real y documentar punto de retorno

### Objetivo
No perder el trabajo hecho en auth, pero evitar que siga interfiriendo con la demo pública.

### Cambios

Crear documento:

- `docs/AUTH_RESUME_PLAN.md`

Debe incluir:

1. Qué ya está implementado:
   - Modelos Prisma.
   - `lib/auth.ts`.
   - `/signin`.
   - sesiones DB.
   - memberships.
   - selección de store.

2. Qué falta:
   - Decidir si se usa Auth.js o auth propia.
   - Completar bootstrap owner seguro.
   - Completar aislamiento por store en todas las APIs.
   - Sacar storeId confiado desde cliente.
   - RBAC server-side real.
   - Recuperación de contraseña si aplica.

3. Cómo retomar:
   - Desactivar `SHOWCASE_MODE`.
   - Activar `AUTH_LOGIN_ENABLED=true`.
   - Correr migraciones.
   - Crear owner inicial.
   - Validar rutas.

### Prompt para Codex

```text
Actuá como technical writer y arquitecto de continuidad.

Objetivo del patch: documentar cómo retomar auth real después de publicar Smart Stock como showcase.

Tareas:
1. Crear `docs/AUTH_RESUME_PLAN.md`.
2. Documentar qué piezas de auth ya existen.
3. Documentar qué falta antes de usar clientes reales.
4. Documentar los flags de producción/showcase/beta.
5. Agregar checklist para pasar de demo pública a beta privada y luego a SaaS real.
6. Actualizar `docs/RUNBOOK.md` con referencia al nuevo documento.

No tocar código salvo links/documentación.
```

### Criterio de aceptación

- El trabajo de auth queda preservado.
- El próximo retome no empieza desde cero.
- La demo pública queda desacoplada de auth incompleta.

---

# Corte mínimo para publicar

Para publicar como muestra pública sin seguir alargando:

1. PATCH 00 — build verde.
2. PATCH 01 — flags unificados.
3. PATCH 02 — showcase sin login.
4. PATCH 03 — seed estable.
5. PATCH 05 — pulido público mínimo.

PATCH 04 es muy recomendable si la demo queda pública con DB compartida.
PATCH 06 es recomendable para no perder continuidad.

---

# Variables de entorno recomendadas para Vercel público

```env
DATABASE_URL=<postgres runtime>
DIRECT_URL=<postgres direct/non-pooling>
OPENAI_API_KEY=<opcional o vacío>
APP_VERSION=showcase
SHOWCASE_MODE=true
SHOWCASE_READONLY=true
NEXT_PUBLIC_SHOWCASE_MODE=true
AUTH_LOGIN_ENABLED=false
ALLOW_DEMO_NO_AUTH=false
ALLOW_DEMO_SEED=false
SEED_DEMO=false
NEXT_PUBLIC_SHOW_DEV_BANNERS=false
```

Para beta privada:

```env
SHOWCASE_MODE=false
SHOWCASE_READONLY=false
NEXT_PUBLIC_SHOWCASE_MODE=false
AUTH_LOGIN_ENABLED=true
BETA_PASSWORD=<clave>
BETA_SECRET=<secreto largo>
```

---

# Comandos de control

```bash
npm ci
npx prisma format
npm run vercel-build
npm run db:seed:showcase
```

Para migraciones futuras:

```bash
npx prisma migrate dev --name <nombre>
npx prisma migrate deploy
```

---

# Checklist final de QA antes de publicar

## Navegación pública

- [ ] `/` carga.
- [ ] `/today` carga sin login.
- [ ] `/dashboard` carga o redirige sanamente a `/today`.
- [ ] `/stock` muestra sugerencias.
- [ ] `/products` muestra catálogo.
- [ ] `/orders` muestra pedidos/borradores.
- [ ] `/import` muestra flujo sin romper.

## Seguridad demo pública

- [ ] `POST /api/products` da 403 en showcase readonly.
- [ ] `POST /api/movements` da 403 en showcase readonly.
- [ ] `POST /api/import/csv` da 403 en showcase readonly.
- [ ] `/api/demo/seed` no queda abierto en producción.
- [ ] No hay datos privados reales en DB.

## Presentación

- [ ] Landing explica qué hace Smart Stock.
- [ ] Panel indica “demo pública”.
- [ ] No aparece “MVP/Dev” feo en producción salvo que se quiera.
- [ ] Metadata básica correcta.
- [ ] Link público listo para portfolio/Upwork/LinkedIn.

---

# Decisión crítica

No intentaría terminar auth ahora.

La auth real importa para SaaS, pero no para demostrar capacidad técnica al público. Ahora mismo es deuda en medio del camino. La mejor jugada es convertirla en deuda controlada: flags claros, showcase público estable y documento de retorno para retomarla después sin perder lo avanzado.
