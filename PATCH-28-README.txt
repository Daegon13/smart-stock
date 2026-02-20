PATCH 28 — Fix ref on <Input/>

¿Qué arregla?
- El build falla con:
  "Property 'ref' does not exist on type '...InputHTMLAttributes...'"
  porque tu componente <Input/> no estaba usando React.forwardRef.

Cómo aplicar:
1) Copiá este patch dentro de la raíz del repo (misma carpeta donde está package.json).
2) Ejecutá:
   node scripts/apply-patch-28.mjs
3) Luego corré:
   npm run vercel-build

Qué cambia:
- components/ui.tsx
  Convierte Input/Textarea/Select a React.forwardRef + displayName.
