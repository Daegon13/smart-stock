# Parche: Asistente IA real + selector de modelo

## Qué hace
- Activa el asistente con OpenAI **de verdad** cuando `OPENAI_API_KEY` está configurada.
- Permite elegir el modelo desde la UI (Auto / Lista / Manual).
- Si la llamada a OpenAI falla, muestra un **diagnóstico** (HTTP + detalle) y luego un resumen básico.

## Archivos incluidos
- `lib/openai.ts`
- `app/api/ai/assistant/route.ts`
- `components/AIAssistant.tsx`

## Cómo aplicar
Copiá estos archivos en tu repo, respetando las rutas.

## Variables de entorno
En tu `.env` local:

```env
OPENAI_API_KEY="TU_KEY"
OPENAI_MODEL="gpt-5"   # opcional (modo Auto)
```

## Probar
1) Reiniciá `npm run dev`
2) Andá a `/assistant`
3) Elegí un modelo y preguntá algo.
