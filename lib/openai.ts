// NOTE:
// The Responses API supports a "developer" role in addition to "system", "user" and "assistant".
// We keep this union here so our helpers can accept the same messages we send to /v1/responses.
// Docs: https://platform.openai.com/docs/api-reference/responses
export type OpenAIRole = "system" | "developer" | "user" | "assistant";

export type ResponsesAPIMessage = {
  role: OpenAIRole;
  content: string;
};

function sanitizeModel(input?: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const model = input.trim();
  if (!model) return undefined;
  // Allow typical OpenAI model id patterns, e.g. gpt-5.2, gpt-4o-mini, etc.
  if (model.length > 80) return undefined;
  if (!/^[A-Za-z0-9._:-]+$/.test(model)) return undefined;
  return model;
}

function extractOutputText(json: any): string {
  // Prefer convenience property if present.
  if (typeof json?.output_text === "string") return json.output_text;

  const out: any[] = Array.isArray(json?.output) ? json.output : [];
  const parts: string[] = [];
  for (const item of out) {
    if (item?.type !== "message") continue;
    const content: any[] = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (c?.type === "output_text" && typeof c?.text === "string") parts.push(c.text);
    }
  }
  return parts.join("\n").trim();
}

export async function createOpenAITextResponse(args: {
  messages: ResponsesAPIMessage[];
  model?: string;
}): Promise<{ text: string; usedAI: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return { text: "", usedAI: false };

  const requested = sanitizeModel(args.model);
  const fallback = sanitizeModel(process.env.OPENAI_MODEL) || "gpt-5";
  const model = requested || fallback;

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      // The Responses API accepts an array of role messages as input items.
      input: args.messages
    })
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    const details = msg ? ` — ${msg.slice(0, 220)}` : "";
    // No rompemos el MVP por errores de IA, pero devolvemos diagnóstico.
    return { text: `No pude usar IA ahora mismo (HTTP ${res.status})${details}`, usedAI: false };
  }

  const json = await res.json().catch(() => null);
  const text = extractOutputText(json);
  return { text: text || "(Respuesta vacía)", usedAI: true };
}

export type JSONSchema = any;

export async function createOpenAIJSONResponse<T = any>(args: {
  messages: ResponsesAPIMessage[];
  schema: JSONSchema;
  model?: string;
}): Promise<{ usedAI: boolean; parsed: T | null; text?: string; error?: string }>
{
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { usedAI: false, parsed: null, error: "OPENAI_API_KEY no configurada" };
  }

  const model = args.model || process.env.OPENAI_MODEL || "gpt-5";

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: args.messages,
        // Structured Outputs (JSON schema)
        text: {
          format: {
            type: "json_schema",
            strict: true,
            schema: args.schema
          }
        }
      })
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.error?.message || `OpenAI error (${res.status})`;
      // Fallback: try plain text (some models might not support json_schema)
      const fallback = await createOpenAITextResponse({ messages: args.messages, model });
      if (fallback.usedAI && fallback.text) {
        try {
          return { usedAI: true, parsed: JSON.parse(fallback.text) as T, text: fallback.text };
        } catch {
          return { usedAI: false, parsed: null, error: msg };
        }
      }
      return { usedAI: false, parsed: null, error: msg };
    }

    const text = extractOutputText(data);
    try {
      const parsed = JSON.parse(text) as T;
      return { usedAI: true, parsed, text };
    } catch (e: any) {
      return { usedAI: false, parsed: null, text, error: "No se pudo parsear JSON" };
    }
  } catch (e: any) {
    return { usedAI: false, parsed: null, error: e?.message || "Error llamando a OpenAI" };
  }
}
