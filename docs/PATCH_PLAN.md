# PATCH_PLAN.md — Smart Stock (Marin) — Plan detallado (v2)

Este documento es el **plan de parches/PRs** con suficiente detalle para que:
- Codex (o cualquier agente) tenga contexto estable,
- cada PR sea **probable de mergear sin romper deploy**,
- se pueda probar rápido (manual + CI),
- podamos “unificar” parches sin caer en PRs gigantes imposibles de revisar.

---

## Principios del plan

### 1) Un PR = un objetivo (pero podemos agrupar por “tren”)
Para ahorrar tiempo, en vez de 12 PRs sueltos, usamos **trenes** (agrupaciones seguras).
Cada tren tiene 2–4 cambios relacionados que:
- comparten pruebas,
- reducen overhead (revisar/mergear),
- no aumentan demasiado el riesgo.

**Regla:** si el tren requiere migración de DB, se separa en 2 PRs:
1) **PR de schema+migración**
2) **PR de uso de la nueva columna/feature**
(para evitar deploys rotos por “código esperando columna que aún no existe”).

### 2) Gate único: `npm run vercel-build`
Todo patch debe terminar con:
- CI verde (`npm run vercel-build` en Linux),
- Preview deploy en Vercel (si aplica),
- checklist de PR completo.

### 3) No DB en build-time
El panel debe ser dinámico y no disparar llamadas a DB durante `next build`.
Si Next intenta prerender y falla, usamos:
- `<Suspense>` cuando corresponde
- o `export const dynamic = "force-dynamic"` (en layout del panel) para cortar prerender.

### 4) Rollback siempre posible
Cada patch indica cómo volver atrás:
- revert commit
- o feature flag (env var) para apagar funciones sin redeploy.

---

## Trenes (agrupaciones recomendadas)

### Tren A — “Beta segura + estabilidad de deploy”
Incluye: **P32 + P35** (y el workflow de CI si aún no está).
Objetivo: panel no abierto + deploy siempre verde.

### Tren B — “Import confiable”
Incluye: **P33 + P34** pero con cuidado:
- B1: schema+migración (link movimientos ↔ batch)
- B2: UI/API (historial + undo)
Objetivo: auditoría + deshacer lote sin romper stock.

### Tren C — “Producción operable”
Incluye: **P36 + P37**
Objetivo: ver errores + evitar abuso/costos IA.

### Tren D — “Producto real (clientes reales)”
Incluye: **P38** (auth real + multi-tenant)
Objetivo: poder tener 2 tiendas/clientes sin data cruzada.

### Tren E — “Escala + UX”
Incluye: **P39 + P40 + P41** (idealmente en 2 trenes: integridad/performance y onboarding)
Objetivo: estabilidad con data real + onboarding que reduce churn.

---

## Checklist de “Definition of Done” (DoD) para TODO PR

- [ ] `npm run vercel-build` pasa local (si posible)
- [ ] CI (GitHub Actions) verde en PR
- [ ] Si hay Prisma:
  - [ ] `npx prisma format`
  - [ ] migración creada y commiteada (si cambia schema)
  - [ ] plan de deploy: `prisma migrate deploy`
- [ ] No se expone panel/endpoints demo en prod sin control
- [ ] Manual test siguiendo sección “Cómo probar”
- [ ] PR tiene: qué cambia / por qué / cómo probar / riesgos / rollback / env vars nuevas

---

## P31 — CI / Quality Gate (GitHub Actions)

### Objetivo
Que **cada PR** corra `npm run vercel-build` en Linux y bloquee merges si falla.

### Scope
- `.github/workflows/ci-vercel-build.yml`
- (Recomendado) Branch protection: requerir check verde.

### Cómo probar
1) Abrir PR con cambio mínimo.
2) Ver workflow corriendo y pasando.
3) Romper a propósito el build (TS error) y confirmar que el check falla.

### Rollback
Borrar workflow o deshabilitar branch protection (no recomendado).

---

## P32 — Beta Gate + seguridad mínima de producción

### Objetivo
Evitar “panel abierto” y proteger endpoints peligrosos en prod.

### Por qué
Si la demo está pública sin auth, cualquier persona puede:
- mirar datos,
- ejecutar seeds/resets,
- forzar acciones.

### Scope
- `/login` (password beta)
- `middleware.ts` protegiendo rutas del panel `/(app)`
- Bloqueos de endpoints demo/diagnóstico en producción:
  - `/api/demo/seed` (y similares)
  - `/api/session/role` (si existiera)
- Ocultar debug IDs en UI cuando `NODE_ENV=production`

### Env vars
- `BETA_PASSWORD`
- `BETA_SECRET`
- `ALLOW_DEMO_SEED` (opcional; default “bloqueado”)

### Cómo probar
**Local**
1) Setear `BETA_PASSWORD` y `BETA_SECRET` en `.env`
2) Ir a `/dashboard` sin cookie -> redirige a `/login`
3) Loguear -> entra al panel

**Vercel**
1) Setear env vars en Project Settings
2) Deploy preview -> repetir pasos
3) Intentar `/api/demo/seed` -> 403 (si no hay ALLOW)

### Riesgos
- Si el middleware está mal, puede bloquear todo.
Mitigación: whitelist de rutas públicas (marketing, login, assets).

### Rollback
- Deshabilitar gate quitando env vars o revert commit.

---

## P33 — Auditoría e historial de imports (TicketImportBatch UI + API)

### Objetivo
Tener un historial visible de imports para:
- soporte,
- confianza,
- detectar duplicados/unmatched.

### Scope
- API: `GET /api/import/batches`
- UI: sección “Historial” en `/import`
- Métricas sugeridas por batch:
  - createdAt, fileName (si aplica)
  - ticketsTotal, linesTotal
  - duplicates, unmatched, errors, skipped

### Cómo probar
1) Importar un archivo CSV/XLSX.
2) Ver el batch en historial con counts.
3) Importar el mismo archivo -> validar dedupe / duplicates.
4) Refrescar -> batch persiste.

### Rollback
Eliminar UI/historial; no afecta datos existentes.

---

## P34 — Undo Import (deshacer lote) de forma segura

### Objetivo
Poder revertir un lote importado sin destruir integridad de stock.

### Scope (técnico)
- DB:
  - `InventoryMovement.importBatchId` (nullable)
  - Relación bidireccional con `TicketImportBatch`
- Pipeline:
  - al crear movimientos desde import, setear `importBatchId`
- API:
  - `POST /api/import/batches/:id/undo`
- Regla de integridad:
  - bloquear undo si hay movimientos posteriores a la fecha del batch (o si el stock fue modificado manualmente después).

### Migración
Este patch implica **migración Prisma** y `prisma migrate deploy` en prod.

### Cómo probar (manual)
1) Importar tickets que generen movimientos OUT.
2) Confirmar que stock bajó.
3) Ejecutar undo del batch.
4) Confirmar:
   - tickets/lines del batch ya no están,
   - movimientos del batch ya no están,
   - stock vuelve a estado previo.
5) Crear movimiento manual después del import.
6) Intentar undo -> debe fallar con 409 y un mensaje “hay movimientos posteriores”.

### Riesgos
- Undo incorrecto puede corromper stock.
Mitigación:
- bloquear undo con movimientos posteriores
- logs/audit de undo

### Rollback
- Deshabilitar endpoint undo por feature flag (env var) o revert commit.
- La columna `importBatchId` puede quedar sin uso (no rompe).

---

## P35 — Hotfixes de estabilidad (Prisma + prerender del panel)

### Objetivo
Mantener deploy verde ante errores típicos:
- Prisma schema invalida (P1012)
- Next prerender tocando hooks/DB en build

### Scope
- Prisma: asegurar relaciones bidireccionales y/o nombres `@relation("...")`
- Next: si falla prerender, usar:
  - `<Suspense>` donde haya `useSearchParams`
  - `export const dynamic = "force-dynamic"` en layout del panel

### Cómo probar
1) `npm ci`
2) `npm run vercel-build` debe pasar
3) CI verde en PR
4) Deploy preview Vercel sin fallar en postinstall/prisma generate

### Rollback
Revert cambios en schema/layout según corresponda.

---

## P36 — Observabilidad (Sentry + requestId + health)

### Objetivo
Ver errores reales en producción y poder debuggear sin adivinar.

### Scope
- Sentry:
  - Frontend (App Router)
  - Server/API routes
- Request ID:
  - generar `x-request-id` por request
  - log con requestId + ruta + storeId (si existe)
- Endpoint:
  - `GET /api/health` => `{ ok: true, version, time }`
  - (Opcional) check DB simple si hay `DATABASE_URL`

### Env vars
- `SENTRY_DSN` (y lo que el SDK pida)
- `APP_VERSION` (opcional, para tracing)

### Cómo probar
1) Configurar Sentry DSN (local y Vercel).
2) Forzar error controlado en un endpoint (solo dev) y confirmar que llega a Sentry.
3) Ver `x-request-id` en responses (Network tab).
4) `/api/health` devuelve ok.

### Rollback
Desactivar Sentry quitando DSN.

---

## P37 — Rate limiting + control de costos IA

### Objetivo
Evitar abuso y controlar costos de IA.

### Scope
- Rate limit (mínimo viable):
  - por IP + ruta (IA)
  - (mejor) por session/user/store cuando exista auth real
- Límites de payload:
  - max tokens/prompt length
  - max tamaño de CSV/JSON en endpoints sensibles
- Auditoría/metrics:
  - log de uso IA (timestamp, endpoint, storeId, tokens estimados)

### Cómo probar
1) Llamar endpoint IA 30–60 veces rápido.
2) Debe empezar a devolver 429.
3) Enviar prompt gigante -> 400 con mensaje claro.
4) Confirmar logs/tabla de “uso IA” (si se implementa).

### Rollback
Feature flag `RATE_LIMIT_ENABLED=false` o revert.

---

## P38 — Auth real + Multi-tenant v1

### Objetivo
Usuarios reales, roles y stores separadas.

### Scope
- Prisma:
  - `User`, `StoreMember` (owner/admin/readonly)
- Auth:
  - NextAuth/Clerk (a decidir)
- Seguridad:
  - storeId se resuelve desde sesión
  - endpoints validan membership/role

### Cómo probar
1) Crear User A Store A, User B Store B.
2) Login como A: no ve datos de B.
3) Intentar pegar API con storeId de B: 403.
4) Usuario readonly: no puede crear/editar.

### Rollback
Mantener beta gate como fallback mientras se migra.

---

## P39 — Integridad + recuperación (recalcular stock)

### Objetivo
Poder recuperar coherencia si el stock se desordena.

### Scope
- Acción “recalcular stock”:
  - recomputar desde `InventoryMovement` (y/o snapshots)
- Validaciones:
  - alertas para stock negativo
  - detección de saltos anómalos
- Constraints (decidir):
  - SKU unique por store (si aplica)

### Cómo probar
1) Corromper stock en dev (movimiento erróneo).
2) Recalcular -> stock vuelve.
3) Probar constraint SKU -> bloquea duplicados.
4) Auditoría registra “recalcular”.

---

## P40 — Performance (catálogos reales)

### Objetivo
No morir con 5k–10k productos, tickets y movimientos.

### Scope
- Paginación API + UI
- Virtualización listas
- Import por chunks y progreso
- Índices en DB y queries sin N+1

### Cómo probar
1) Seed con miles de productos/tickets.
2) Navegar listas sin freeze.
3) Import grande sin timeout.
4) Medir tiempos y memory.

---

## P41 — Onboarding anti-fricción

### Objetivo
Reducir churn: “primer resultado” rápido.

### Scope
- Checklist de estado en dashboard:
  - faltan proveedores
  - faltan mínimos
  - hay unmatched
- Wizard “primer pedido”:
  - seleccionar proveedor
  - revisar sugerencias
  - generar OC/WhatsApp

### Cómo probar
1) Store vacía -> checklist guía.
2) Completar pasos -> checklist baja.
3) Usuario nuevo llega a pedido en < 15 min.

---

## Plantillas

### Plantilla de PR (copiar y pegar)
- **Qué cambia:** …
- **Por qué:** …
- **Cómo probar (pasos):** …
- **Env vars nuevas:** …
- **Migraciones:** (sí/no, comando)
- **Riesgos:** …
- **Rollback:** …

### Plantilla de QA (manual)
1) `npm run vercel-build`
2) Rutas clave:
   - `/` landing
   - `/login` (si aplica)
   - `/dashboard`, `/import`, `/assistant`
3) Importar archivo de prueba
4) Undo batch (si aplica)
5) Probar IA (si aplica)

### Estado parcial P38 (auth-prod-multitenant)
- Implementado: modelos multi-tenant + sesiones DB + selección de store activa.
- Implementado: helpers server-side `requireUser/requireOrgAccess/requireStoreAccess/requireActiveStore`.
- Implementado: enforcement inicial en APIs de `products`, `movements`, `categories` ignorando `storeId` del cliente.
- Pendiente: integración completa Auth.js/NextAuth (bloqueada por política de paquetes del entorno).
- Implementado: flag de desarrollo `AUTH_LOGIN_ENABLED=false` para bypass de login sin afectar producción.
