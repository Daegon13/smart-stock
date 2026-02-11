type ResponsesAPIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

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

  const model = args.model || process.env.OPENAI_MODEL || "gpt-5";

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: args.messages,
      text: { format: { type: "text" } }
    })
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    // No rompemos el MVP por errores de IA.
    return { text: `No pude usar IA ahora mismo. (${res.status})`, usedAI: false };
  }

  const json = await res.json().catch(() => null);
  const text = extractOutputText(json);
  return { text: text || "(Respuesta vacía)", usedAI: true };
}
