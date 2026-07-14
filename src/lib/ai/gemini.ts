// Cliente mínimo da API Gemini (generateContent, v1beta) com function calling.
// Usa fetch — sem dependência extra. Chave via env GEMINI_API_KEY.
import "server-only";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export type Part =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

export type Content = { role: "user" | "model"; parts: Part[] };

export type FunctionDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type GeminiResult = {
  text: string;
  functionCalls: { name: string; args: Record<string, unknown> }[];
  // Partes cruas da resposta do modelo — devem ser reenviadas VERBATIM no
  // próximo turno (carregam o thoughtSignature exigido pelos modelos novos).
  rawParts: Part[];
};

export async function generateContent(opts: {
  system: string;
  contents: Content[];
  tools?: FunctionDeclaration[];
}): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada.");
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.contents,
    generationConfig: { temperature: 0.3 },
  };
  if (opts.tools?.length) {
    body.tools = [{ functionDeclarations: opts.tools }];
  }

  const res = await fetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // sem cache — cada chamada reflete o estado atual
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text();
    let detail = errText.slice(0, 600);
    try {
      const j = JSON.parse(errText);
      if (j?.error?.message) detail = `${j.error.status ?? ""} ${j.error.message}`.trim();
    } catch {
      /* mantém o texto cru */
    }
    throw new Error(`Gemini ${res.status} (modelo: ${model}): ${detail}`);
  }

  const data = await res.json();
  const parts: Part[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p): p is { text: string } => "text" in p && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();
  const functionCalls = parts
    .filter(
      (p): p is { functionCall: { name: string; args: Record<string, unknown> } } =>
        "functionCall" in p
    )
    .map((p) => ({ name: p.functionCall.name, args: p.functionCall.args ?? {} }));

  return { text, functionCalls, rawParts: parts };
}
