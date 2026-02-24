# Arquitectura (resumen práctico)

## Stack
- Next.js 14 (App Router)
- React + TypeScript
- Prisma ORM
- PostgreSQL (ideal: Supabase u otro Postgres gestionado)
- Deploy en Vercel

## Estructura del repo (alto nivel)
- `app/`
  - `app/(marketing)/page.tsx`: landing/marketing
  - `app/(auth)/login/*`: beta gate simple (password + cookie)
  - `app/(app)/*`: panel principal
  - `app/api/*`: API routes (productos, movimientos, importación, IA, etc.)
- `components/`: UI y features (import wizards, reconcile, stock intelligence, etc.)
- `lib/`: lógica reusable (db, import pipeline, openai, validaciones, rbac/beta auth, auditoría)
- `prisma/schema.prisma`: modelos y relaciones
- `scripts/`: utilidades (switch postgres, prisma generate safe, etc.)
- `.github/workflows/*`: CI (vercel-build)

## Principales páginas del panel (app/(app))
- `/dashboard`: resumen y accesos
- `/products`, `/suppliers`, `/categories`: ABM básico
- `/movements`: entradas/salidas/ajustes de stock
- `/import`: importación CSV/XLSX + mapeo + batches
- `/tickets`, `/reconcile`: tickets importados y conciliación (unmatched -> match a product)
- `/stock`: sugerencias de compra + export/OC
- `/assistant`, `/copilot`: IA (asistente general + copiloto para acciones)

## Flujos clave

### 1) Importación de tickets (CSV/XLSX)
1. Usuario sube archivo (CSV/XLSX).
2. Wizard mapea columnas (auto-mapeo y sugerencias).
3. Pipeline normaliza (POS normalize), crea `TicketImportBatch`.
4. Crea `Ticket` + `TicketLine`.
5. Para líneas matcheadas, genera `InventoryMovement` tipo OUT (ventas).
6. Se registran métricas del batch: duplicados, skipped, unmatched, etc.

Puntos sensibles:
- Dedupe (`Ticket.hash`) para evitar tickets duplicados.
- Aliases (`ProductAlias`) para mejorar match por código/nombre.
- No romper stock con importaciones erróneas: por eso existe “undo batch”.

### 2) Conciliación (unmatched)
- Se listan líneas sin productId.
- Usuario elige producto correcto y define alcance:
  - aplicar al mismo código / mismo nombre / familia de nombres (si existe)
- Opción de guardar alias (code/name) para matches futuros.

### 3) Sugerencias de compra + Órdenes
- Se calcula reposición usando:
  - stock actual (`Product.currentStock`)
  - configuración por producto (`stockMin`, `leadTimeDays`, `coverageDays`, `safetyStock`)
  - ventas recientes (tickets)
- Se generan grupos por proveedor y se puede crear borrador/OC.

### 4) IA (Assistant/Copilot)
- Assistant: responder y orientar, con fallback si no hay API key.
- Copilot: acciones (crear producto, actualizar stock min, etc.) con auditoría.

## Modelo de datos (mínimo mental)
- `Store` -> todo cuelga de esto.
- `Product` con config de reposición y stock actual.
- `InventoryMovement` cambia stock (manual o generado por import).
- `TicketImportBatch` agrupa tickets importados.
- `Ticket` + `TicketLine` representan ventas importadas.
- `AuditLog` registra acciones (usuario/copilot).

## Consideración para build/deploy
- Next build hace typecheck + prerender. El panel debe evitar DB calls en build-time.
- Recomendación: `export const dynamic = "force-dynamic";` en layout del panel si aparece prerendering inesperado.

## Auth y aislamiento multi-tenant v1
- Sesiones persistidas en DB (`Session`) para soportar multi-sesión y revocación.
- Modelo jerárquico: `Organization -> Franchise -> Store`.
- Membresías: `OrgMember` y `StoreMember` (StoreMember override por local).
- Contexto activo de local por cookie `ss_active_store` (validada server-side).
- Fallback dev/demo disponible solo con `ALLOW_DEMO_NO_AUTH=true`.
