import { NextResponse } from "next/server";
import { z } from "zod";
import { createOpenAITextResponse } from "@/lib/openai";
import { guessTicketMapping, type TicketMappingKey, type TicketMapping } from "@/lib/ticketMapping";

const BodySchema = z.object({
  headers: z.array(z.string().min(1)).min(1),
  rows: z.array(z.array(z.string())).optional().default([]),
  model: z.string().optional()
});

function extractJsonObject(text: string): any | null {
  if (!text) return null;
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;
  const slice = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function sanitizeMapping(headers: string[], mapping: Partial<TicketMapping>): TicketMapping {
  const out: TicketMapping = {
    ticketId: "",
    issuedAt: "",
    sku: "",
    name: "",
    qty: "",
    unitPrice: "",
    lineTotal: "",
    ticketTotal: ""
  };

  (Object.keys(out) as TicketMappingKey[]).forEach((k) => {
    const v = (mapping as any)?.[k];
    if (typeof v === "string" && v && headers.includes(v)) (out as any)[k] = v;
  });
  return out;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Payload inválido", detail: parsed.error.flatten() } }, { status: 400 });
  }

  const { headers, rows, model } = parsed.data;
  const sampleRows = rows.slice(0, 20);

  const heur = guessTicketMapping(headers, sampleRows);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      usedAI: false,
      mapping: heur.mapping,
      confidence: heur.confidence,
      notes: ["(Sin OPENAI_API_KEY) Usando sugerencia automática local.", ...heur.notes]
    });
  }

  const prompt = {
    role: "user" as const,
    content:
      "Sos un asistente que ayuda a mapear columnas de importación de TICKETS / VENTAS (minimarket).\n" +
      "Necesito elegir, entre estos encabezados EXACTOS, qué columna corresponde a cada campo: ticketId, issuedAt, sku, name, qty, unitPrice, lineTotal, ticketTotal.\n" +
      "Reglas:\n" +
      "- Solo podés devolver valores que EXISTAN en headers. Si no hay buen match, usá \"\".\n" +
      "- Devolvé JSON estricto (sin texto extra, sin markdown) con esta forma: { mapping: {ticketId,issuedAt,sku,name,qty,unitPrice,lineTotal,ticketTotal}, confidence: {..}, notes: string[] }\n" +
      "- confidence son números 0..1.\n\n" +
      "headers:\n" +
      JSON.stringify(headers) +
      "\n\nsampleRows (array de filas, mismo orden de columnas):\n" +
      JSON.stringify(sampleRows)
  };

  const ai = await createOpenAITextResponse({
    model,
    messages: [
      {
        role: "system",
        content:
          "Devolvé SOLO JSON válido. No uses markdown. No agregues comentarios fuera del JSON. Si no estás seguro, dejá el campo vacío y bajá confidence."
      },
      prompt
    ]
  });

  const obj = extractJsonObject(ai.text);
  const mapping = sanitizeMapping(headers, obj?.mapping || {});

  const confidence: Record<TicketMappingKey, number> = { ...heur.confidence };
  if (obj?.confidence && typeof obj.confidence === "object") {
    (Object.keys(confidence) as TicketMappingKey[]).forEach((k) => {
      const v = obj.confidence?.[k];
      if (typeof v === "number" && Number.isFinite(v)) confidence[k] = Math.max(0, Math.min(1, v));
    });
  }

  const notes = Array.isArray(obj?.notes) ? obj.notes.map((x: any) => String(x)) : [];
  const usedAI = ai.usedAI && !!obj;

  if (!usedAI) {
    return NextResponse.json({
      usedAI: false,
      mapping: heur.mapping,
      confidence: heur.confidence,
      notes: ["No pude leer una respuesta válida de IA. Usando sugerencia automática local.", ...heur.notes]
    });
  }

  return NextResponse.json({ usedAI: true, mapping, confidence, notes });
}
