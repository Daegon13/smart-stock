# Patch 07 — Plantillas + Auto-mapeo + Sugerencia con IA (Import)

## Qué agrega
- **Plantillas descargables** (CSV y Excel) para cargar productos rápido.
- **Auto-mapeo mejorado** (usa encabezados + una muestra de filas).
- **Sugerencia con IA** opcional para mapear columnas raras (ej: "Precio compra" vs "Precio venta").

## Requisitos
- Para la sugerencia con IA: configurar `OPENAI_API_KEY` (y opcional `OPENAI_MODEL`) en tu `.env`.
  - Si no hay API key, igual funciona el **Auto-mapeo local**.

## Cómo aplicar
1) Copiá/pegá los archivos del patch encima del repo (manteniendo rutas).
2) Instalá deps y corré:

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Cómo probar
1) Ir a **Importar**.
2) Bajarte una plantilla y pegar algunos productos.
3) Importar con CSV o Excel.
4) En el paso "Mapeo de columnas":
   - Probar **Auto-mapear**.
   - (Opcional) Probar **Sugerir con IA** (podés escribir un modelo como `gpt-5`, o dejar vacío y usa `OPENAI_MODEL`).
