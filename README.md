# Patch 05 — Importador CSV (Wizard + API)

## Qué agrega
- Página **/import** con wizard de 3 pasos: subir CSV → mapear columnas → previsualizar e importar.
- Endpoint **POST /api/import/csv** que crea/actualiza productos y registra un movimiento **ADJUST** si viene stock.
- Link "Importar CSV" en el menú lateral.

## Cómo aplicar
1) Copiá/pegá el contenido del ZIP en la raíz del repo (sobrescribe archivos si te lo pide).
2) Reiniciá el dev server:
   - `npm run dev`
3) Ir a **/import**.

## Notas
- MVP: importa hasta **2000 filas** por ejecución.
- Upsert:
  - Si hay SKU → intenta matchear por SKU.
  - Si no hay SKU → intenta matchear por Nombre.
- Si mapeás Stock, se crea un movimiento **ADJUST** con nota "Import CSV".
