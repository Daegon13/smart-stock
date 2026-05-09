# Smart Stock — Auth Resume Plan

Este documento deja explícito cómo retomar Smart Stock desde el release de portfolio público hacia una beta privada/SaaS real sin mezclar ese trabajo con el showcase read-only.

## Punto de partida

El estado actual del producto es **SHOWCASE_MODE público read-only**:

```env
SHOWCASE_MODE=true
NEXT_PUBLIC_SHOWCASE_MODE=true
SHOWCASE_READONLY=true
NEXT_PUBLIC_SHOWCASE_READONLY=true
AUTH_LOGIN_ENABLED=false
```

Ese modo permite mostrar el producto con datos ficticios y bloquea mutaciones peligrosas sobre una base compartida. No debe confundirse con auth SaaS terminada.

## Piezas de auth que ya existen

### Modelo de datos

Prisma ya contiene las bases para auth y multi-tenant:

- `User` con `email`, `name` y `passwordHash`.
- `Session` con `sessionToken`, expiración y relación a `User`.
- `Account` y `VerificationToken`, compatibles con una futura integración tipo Auth.js/NextAuth.
- `Organization` y `Franchise` para agrupar locales.
- `OrgMember` con `role` por organización.
- `StoreMember` con `role` por local.
- `Store` relacionado opcionalmente a `Organization` y `Franchise`.

### Helpers server-side

Ya existen utilidades para:

- hashear y verificar passwords con `scrypt`;
- crear y destruir sesiones DB;
- leer sesión desde cookie `ss_session`;
- exigir usuario con `requireUser()`;
- exigir acceso a organización/local;
- resolver local activo con cookie `ss_active_store`;
- seleccionar local activo para la sesión.

### Flujos y flags existentes

- Pantallas/rutas de auth en `app/(auth)` para login/signin/logout/signout.
- Beta gate simple por password con cookie `ss_beta`.
- Flags centralizados en `lib/runtimeFlags.ts` para auth, showcase, readonly, bypass demo y seed.
- Guardas read-only para bloquear mutaciones en modo showcase.
- RBAC preliminar con roles `owner`, `manager`, `staff` y `viewer` en endpoints que ya lo adoptaron.

## Qué falta para SaaS real

Para pasar a SaaS/beta privada no alcanza con desactivar showcase. Falta completar y endurecer:

1. **Onboarding controlado**
   - Crear flujo para alta de organización, primer owner y primer local.
   - Definir si el alta será self-serve, invitación manual o bootstrap administrativo.

2. **Auth end-to-end**
   - Decidir proveedor final: credenciales propias, Auth.js/NextAuth o proveedor externo.
   - Completar login, logout, expiración, recuperación de password y rotación de sesiones.
   - Proteger contra enumeración de usuarios y fuerza bruta.

3. **Autorización server-side completa**
   - Reemplazar roles demo/cookies legibles por roles derivados de sesión DB.
   - Auditar todas las rutas API y Server Actions para exigir permisos explícitos.
   - Unificar nombres de roles entre `AuthRole`, `ApiRole` y RBAC.

4. **Aislamiento multi-tenant**
   - Resolver siempre `organizationId`, `storeId` y permisos desde sesión, nunca desde input confiado del cliente.
   - Revisar endpoints que todavía aceptan `storeId` en body/query.
   - Agregar pruebas de aislamiento entre tiendas/organizaciones.

5. **Operación SaaS**
   - Backups y restore probados.
   - Rate limits productivos.
   - Observabilidad de auth y errores de permisos.
   - Políticas de soporte, eliminación/exportación de datos y auditoría.

## Cómo pasar de SHOWCASE_MODE a beta privada

### Fase 0 — Mantener portfolio estable

No tocar UI ni lógica de negocio. Mantener:

```env
SHOWCASE_MODE=true
SHOWCASE_READONLY=true
AUTH_LOGIN_ENABLED=false
```

### Fase 1 — Preparar entorno privado

Crear un entorno separado de base de datos y deploy. No reutilizar la DB pública del showcase para clientes reales.

Variables sugeridas:

```env
SHOWCASE_MODE=false
NEXT_PUBLIC_SHOWCASE_MODE=false
SHOWCASE_READONLY=false
NEXT_PUBLIC_SHOWCASE_READONLY=false
AUTH_LOGIN_ENABLED=true
BETA_PASSWORD=<password temporal>
BETA_SECRET=<secreto largo aleatorio>
ALLOW_DEMO_NO_AUTH=false
ALLOW_DEMO_SEED=false
SEED_DEMO=false
DATABASE_URL=<private beta database>
DIRECT_URL=<private beta direct database>
```

### Fase 2 — Bootstrap privado

- Aplicar Prisma sobre la base privada.
- Crear organización, owner y local inicial mediante script administrativo o endpoint protegido temporalmente.
- Confirmar que `ss_session` y `ss_active_store` se emiten y validan correctamente.
- Deshabilitar cualquier endpoint de seed público.

### Fase 3 — Reemplazar permisos demo por permisos reales

- Modificar `lib/apiAuth.ts` para resolver contexto desde `requireActiveStore()`/sesión real.
- Eliminar dependencia de `ss_role` como fuente de autoridad server-side.
- Usar `OrgMember`/`StoreMember` para decidir permisos.
- Mantener `SHOWCASE_MODE` como bypass explícito solo para portfolio.

### Fase 4 — Hardening antes de usuarios externos

- Agregar tests de 401/403 y aislamiento por tenant.
- Revisar endpoints de importación, reconciliación, compras y stock.
- Asegurar que cada mutación filtra por `storeId` autorizado.
- Registrar auditoría con usuario real, rol real e IP/user-agent cuando aplique.

## Riesgos pendientes de multi-tenant/RBAC

- **Store spoofing:** endpoints que aceptan `storeId` desde request pueden permitir acceso cruzado si no se valida contra sesión.
- **Rol spoofing:** cookies/headers de rol usados para demo no son autoridad válida en SaaS.
- **Permisos incompletos:** no todas las rutas tienen permisos granulares uniformes.
- **Org vs Store role precedence:** falta definir reglas cuando un usuario tiene rol a nivel organización y otro a nivel local.
- **Mutaciones indirectas:** imports, conciliaciones, recálculos y acciones IA pueden modificar múltiples tablas y requieren permisos específicos.
- **Datos legacy sin organización/local consistente:** hay que auditar registros anteriores o seeds que no tengan tenancy completa.
- **Auditoría parcial:** no todos los cambios registran actor real, tenant y contexto suficiente para investigación.

## Criterio de salida para beta privada

Antes de invitar usuarios reales:

- `SHOWCASE_MODE=false` en el entorno privado.
- Login real o beta gate protegido y documentado.
- Todas las rutas sensibles resuelven tenant desde sesión.
- RBAC server-side aplicado en cada mutación.
- Tests mínimos de aislamiento multi-tenant y permisos.
- Seed demo deshabilitado públicamente.
- Runbook actualizado con operación de usuarios, backups y rollback.
