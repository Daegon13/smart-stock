# PRODUCT_READINESS.md

## Baseline (Tren 0)
- Fecha: 2026-02-22
- Rama: `train-1-ux-consistency`
- Build de referencia: `npm run vercel-build` ✅

## Estado actual (qué ya existe)

### UX / Producto
- Navegación principal orientada a tareas (`Hoy`, `Importar ventas`, `Reposición`, `Pedidos`) con sección `Más` para módulos secundarios.
- Home operativa en `/today` y compatibilidad de ruta legacy en `/dashboard` (redirige a `/today`).
- Modo senior básico con toggles persistentes (`Texto grande`, `Modo simple`) aplicados globalmente vía clases en `<body>`.
- Empty states mejorados en Reposición e Import para guiar la próxima acción.

### Confiabilidad de operaciones
- Historial de lotes de import en UI y endpoint de undo por batch.
- Undo bloqueado cuando existen movimientos posteriores (retorno 409 con explicación).
- API de sugerencias de stock con señal de readiness para distinguir: sin productos, sin ventas, falta configuración, o sin urgentes.

### Seguridad / plataforma
- Gate beta existente (password/cookie) y restricciones de seed demo en producción condicionadas por env vars.
- App Router con layout dinámico para evitar prerender conflictivo del panel.

## Riesgos abiertos
1. **Auth real y multi-tenant incompletos**
   - Falta identidad real de usuario + membership por tienda con RBAC server-side en todas las rutas.
2. **Aislamiento por `storeId` todavía frágil**
   - Existen endpoints que aceptan `storeId` por request; debe resolverse desde sesión para hardening.
3. **Observabilidad parcial**
   - Existe logging básico, pero falta estandarizar request tracing (requestId transversal), alertas y monitoreo externo.
4. **Monetización no implementada**
   - No hay planes, checkout ni webhooks de facturación para pasar a producto comercial.
5. **Escala operativa**
   - Para catálogos/imports grandes aún faltan paginación robusta, chunking/background y métricas de performance.

## Decisiones propuestas (para siguientes trenes)
1. **Auth**: implementar **NextAuth/Auth.js** con credenciales email+password (fase 1) para minimizar lock-in y mantener control en stack Next.js + Prisma.
2. **Tenant + RBAC**: introducir `User` + `StoreMember(role)` en Prisma, y resolver `storeId` siempre desde sesión en server/middleware.
3. **Billing**: adoptar **Stripe Subscriptions** (modo test en Tren 5) con límites por plan aplicados server-side.
4. **Demo/diagnóstico en prod**: mantener “deny by default”, habilitando sólo con flags explícitas de entorno.
5. **Rollout**: seguir merge incremental por trenes, manteniendo `npm run vercel-build` verde en cada PR.

## Criterio de avance al Tren 1
- Baseline verde confirmado.
- Documento de readiness creado y versionado.
- Próximo paso: cerrar inconsistencias UX restantes en una PR enfocada del `train-1-ux-consistency`.
