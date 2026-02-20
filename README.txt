PATCH 26 - Robust CardHeader typing (ReactNode)

Qué arregla:
- Evita que el build falle cuando usás <CardHeader title={...JSX...} />.
  Ahora 'title' y 'subtitle' aceptan ReactNode (string o JSX).
- Exporta CardTitle y CardDescription desde '@/components/ui' por compatibilidad.

Cómo aplicar:
1) Descomprimí el ZIP en la raíz del repo (smart-stock).
2) Ejecutá:
   node scripts/apply-patch-26.mjs
3) Probá local:
   npm run vercel-build
4) Commit + push:
   git add -A
   git commit -m "fix(ui): CardHeader accepts ReactNode"
   git push

Si el script avisa que no encontró el bloque CardHeader:
- Abrí components/ui.tsx y cambiá en los tipos de CardHeader:
  title: string  -> title: ReactNode
  subtitle?: string -> subtitle?: ReactNode
