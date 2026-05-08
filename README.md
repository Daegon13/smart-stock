# Smart Stock

Smart Stock es una aplicación web de gestión inteligente de inventario para comercios minoristas, minimarkets y operaciones con múltiples locales. El proyecto está preparado como showcase técnico público: permite explorar flujos reales de stock, compras, tickets POS y recomendaciones operativas usando datos ficticios estables.

> **Estado actual:** portfolio showcase público, navegable y en modo solo lectura. Smart Stock todavía no es un SaaS productivo terminado.

## Demo pública

- **Demo:** `https://<smart-stock-demo-url>` <!-- TODO: reemplazar por la URL pública definitiva. -->
- **Modo recomendado para demo:** `SHOWCASE_MODE=true` y `SHOWCASE_READONLY=true`.

## Problema que resuelve

Los comercios chicos y medianos suelen gestionar stock con planillas, reposición manual y poca visibilidad sobre ventas POS. Eso genera:

- quiebres de stock en productos críticos;
- sobrecompra en productos lentos;
- baja trazabilidad entre tickets, movimientos y compras;
- decisiones de reposición sin métricas consistentes;
- dificultad para escalar de un local a una operación multi-local.

Smart Stock centraliza datos de inventario, ventas importadas, proveedores y órdenes de compra para transformar operaciones diarias en señales accionables.

## Stack técnico

- **Frontend:** Next.js App Router, React, TypeScript y Tailwind CSS.
- **Backend:** Route Handlers de Next.js, Server Actions y helpers server-side.
- **Base de datos:** PostgreSQL vía Prisma ORM.
- **Validación:** Zod en endpoints y flujos de importación.
- **Build/deploy:** Vercel-oriented build scripts, Prisma generate y seed controlado.
- **IA opcional:** integración preparada para OpenAI mediante `OPENAI_API_KEY` y `OPENAI_MODEL`.

## Módulos principales

- **Dashboard / Today:** resumen operativo del día, alertas y señales de inventario.
- **Productos y categorías:** catálogo, mínimos, costos, precios, proveedores y taxonomías.
- **Stock y movimientos:** seguimiento de existencias, ajustes y recálculo desde movimientos.
- **Compras y órdenes:** borradores, órdenes de compra y recepción de mercadería.
- **Importación POS:** carga de tickets CSV/XLSX, normalización y conciliación con productos.
- **Aliases y reconciliación:** reglas para mapear códigos/nombres POS a productos internos.
- **Copiloto / Assistant:** superficie preparada para análisis asistido y acciones auditables.
- **Auditoría:** registro de acciones relevantes para trazabilidad operativa.
- **Auth y multi-tenant:** piezas base ya modeladas, preservadas para una futura beta privada.

## Estado actual: showcase público read-only

El release público está optimizado para portfolio:

- muestra una operación demo con datos ficticios;
- permite navegar el producto sin completar auth real;
- bloquea mutaciones peligrosas cuando `SHOWCASE_READONLY=true`;
- mantiene el camino técnico para reactivar auth, sesiones DB, roles y multi-tenant;
- evita exponer una base compartida a escrituras anónimas.

## Qué NO es todavía

Smart Stock **no** debe presentarse aún como SaaS terminado. En particular, todavía faltan hardening y validación productiva de:

- alta/onboarding de organizaciones reales;
- autenticación end-to-end para clientes;
- autorización RBAC server-side en todas las rutas;
- aislamiento multi-tenant exhaustivo por sesión;
- gestión completa de usuarios, invitaciones y roles;
- procesos de soporte, billing, backups y operación productiva.

## Cómo correr localmente

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar entorno

Crear `.env` a partir de `.env.example` y definir como mínimo:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

Para correr localmente como showcase:

```env
SHOWCASE_MODE=true
NEXT_PUBLIC_SHOWCASE_MODE=true
SHOWCASE_READONLY=true
NEXT_PUBLIC_SHOWCASE_READONLY=true
AUTH_LOGIN_ENABLED=false
DEMO_STORE_ID=""
ALLOW_DEMO_SEED=false
SEED_DEMO=false
```

### 3. Preparar Prisma y base de datos

```bash
npm run prisma:generate
npm run db:push
npm run db:seed:showcase
```

> `db:seed:showcase` carga datos demo determinísticos para el portfolio público. Usar solo contra una base preparada para demo o desarrollo.

### 4. Levantar la app

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Variables principales

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | URL principal de PostgreSQL para runtime y Prisma. |
| `DIRECT_URL` | URL directa/no-pooling para operaciones Prisma cuando el proveedor lo requiere. |
| `AUTH_LOGIN_ENABLED` | Habilita el flujo de login real/beta cuando no se está en showcase. |
| `SHOWCASE_MODE` | Activa navegación pública tipo demo sin depender de auth real. |
| `NEXT_PUBLIC_SHOWCASE_MODE` | Refleja el modo showcase en UI/código cliente. |
| `SHOWCASE_READONLY` | Bloquea mutaciones server-side en la demo pública. |
| `NEXT_PUBLIC_SHOWCASE_READONLY` | Permite mostrar copy de solo lectura en cliente. |
| `DEMO_STORE_ID` / `SHOWCASE_STORE_ID` | Fija el local demo estable para showcase. |
| `ALLOW_DEMO_NO_AUTH` | Escape hatch local/no producción para demo sin auth. |
| `ALLOW_DEMO_SEED` | Habilita explícitamente endpoints/scripts de seed donde corresponda. |
| `BETA_PASSWORD` / `BETA_SECRET` | Configuran el beta gate privado. |
| `OPENAI_API_KEY` | Habilita integraciones IA opcionales. |
| `OPENAI_MODEL` | Modelo usado por las funciones IA. |
| `NEXT_PUBLIC_SITE_URL` | URL canónica pública para metadata y links. |
| `NEXT_PUBLIC_CONTACT_URL` | CTA de contacto público. |
| `APP_VERSION` | Etiqueta de versión/entorno para observabilidad o deploy. |

## Comandos útiles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Next.js en desarrollo. |
| `npm run typecheck` | Ejecuta TypeScript sin emitir archivos. |
| `npm run lint` | Ejecuta lint de Next.js. |
| `npm run build` | Genera Prisma, empuja schema, ejecuta seed condicional y compila Next.js. |
| `npm run vercel-build` | Build recomendado para Vercel: usa Postgres, genera Prisma y compila Next.js. |
| `npm run prisma:generate` | Genera Prisma Client. |
| `npm run db:push` | Aplica el schema Prisma a la base configurada. |
| `npm run db:seed:showcase` | Carga dataset demo para portfolio público. |
| `npm run db:seed:maybe` | Seed condicional controlado por variables de entorno. |

## Notas para release

- Mantener el showcase público en solo lectura.
- No completar auth de email en este release de portfolio.
- Documentar cualquier cambio futuro de SaaS en `docs/AUTH_RESUME_PLAN.md` antes de modificar auth, tenancy o RBAC.
