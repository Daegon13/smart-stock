# MERGE_TRAINS.md — Cómo unificar parches sin romper todo

## La idea
Para ahorrar tiempo, unificamos PRs en “trenes” (A, B, C…) **pero** sin perder control.

## Regla de seguridad
Si el tren incluye cambios de Prisma/DB:
- **PR 1:** schema + migración (sin usar aún la nueva columna en runtime si es posible)
- **PR 2:** código/UI que usa esa columna + endpoints

Así evitás: “deploy rompe porque la DB todavía no tiene la columna”.

## Trenes recomendados
- **Tren A:** Seguridad beta + estabilidad (P32 + P35)  
  Pruebas: login gate + vercel-build + rutas públicas.

- **Tren B:** Import confiable (P33 + P34)  
  B1 (DB): relación + migración  
  B2 (features): historial + undo  
  Pruebas: importar → historial → undo → bloqueo por movimientos posteriores.

- **Tren C:** Producción operable (P36 + P37)  
  Pruebas: Sentry recibe error + health ok + rate limit 429 en IA.

- **Tren D:** Auth real (P38)  
  Pruebas: store isolation + roles + 403.

- **Tren E:** Integridad/performance/onboarding (P39–P41)  
  Mejor dividir en 2: (integridad+performance) y (onboarding).

## Cómo ejecutar un tren
1) Crear rama: `train-a-security`
2) Aplicar cambios del tren (en commits separados dentro de la rama)
3) Abrir PR
4) CI verde + Preview OK
5) Merge
