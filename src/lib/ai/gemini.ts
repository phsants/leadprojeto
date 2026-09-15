// Provedor Gemini (generateContent, v1beta) com function calling. Usa fetch,
// sem dependência extra. Chave via env GEMINI_API_KEY (gratuita no AI Studio).
//
// Resiliência: 429/5xx/rede são retentados com espera curta; se o modelo
// principal continuar indisponível, tenta o modelo reserva da mesma chave
// (GEMINI_FALLBACK_MODEL, padrão gemini-flash-lite-latest). Só depois disso o
// assistente passa ao próximo provedor da cadeia (Groq).
import "server-only";
import {
  LlmError,
  isRetryableStatus,
  withRetry,
  type GenerateOpts,
  type LlmProvider,
  type LlmResult,
  type ToolCall,
  type Turn,
} from "./provider";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const PROVIDER = "gemini";

export type Part =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

export type Content = { role: "user" | "model"; parts: Part[] };

export function geminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function geminiModels(): string[] {
  const primary = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const fallback = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest";
  return [...new Set([primary, fallback])];
}

/**
 * Converte a conversa neutra para o formato Gemini. Um turno do assistente
 * gerado pelo PRÓPRIO Gemini é reenviado com as partes cruas (carregam o
 * thoughtSignature exigido pelos modelos novos); um turno gerado por outro
 * provedor é reconstruído a partir de texto + chamadas de ferramenta.
 */
export function turnsToContents(turns: Turn[]): Content[] {
  const out: Content[] = [];
  for (const t of turns) {
    if (t.role === "user") {
      out.push({ role: "user", parts: [{ text: t.text }] });
    } else if (t.role === "assistant") {
      if (t.raw && t.raw.provider === PROVIDER && t.raw.parts.length > 0) {
        out.push({ role: "model", parts: t.raw.parts as Part[] });
      } else {
        const parts: Part[] = [];
        if (t.text) parts.push({ text: t.text });
        for (const c of t.toolCalls) parts.push({ functionCall: { name: c.name, args: c.args } });
        if (parts.length === 0) parts.push({ text: "…" });
        out.push({ role: "model", parts });
      }
    } else {
      out.push({
        role: "user",
        parts: t.results.map((r) => ({ functionResponse: { name: r.name, response: r.result } })),
      });
    }
  }
  return out;
}

async function callModel(model: string, key: string, body: unknown): Promise<LlmResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store", // cada chamada reflete o estado atual
    });
  } catch (e) {
    throw new LlmError(`Gemini rede (modelo: ${model}): ${(e as Error).message}`, PROVIDER, null, true);
  }

  if (!res.ok) {
    const errText = await res.text();
    let detail = errText.slice(0, 600);
    try {
      const j = JSON.parse(errText);
      if (j?.error?.message) detail = `${j.error.status ?? ""} ${j.error.message}`.trim();
    } catch {
      /* mantém o texto cru */
    }
    throw new LlmError(`Gemini ${res.status} (modelo: ${model}): ${detail}`, PROVIDER, res.status, isRetryableStatus(res.status));
  }

  const data = await res.json();
  const parts: Part[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p): p is { text: string } => "text" in p && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();
  const stamp = Date.now().toString(36);
  const toolCalls: ToolCall[] = parts
    .filter(
      (p): p is { functionCall: { name: string; args: Record<string, unknown> } } => "functionCall" in p
    )
    .map((p, i) => ({ id: `gem_${stamp}_${i}`, name: p.functionCall.name, args: p.functionCall.args ?? {} }));

  return { text, toolCalls, raw: { provider: PROVIDER, parts } };
}

/** Esperas entre tentativas do MESMO modelo (3 tentativas no total). */
const RETRY_DELAYS_MS = [700, 1800];

export const geminiProvider: LlmProvider = {
  name: PROVIDER,
  async generate(opts: GenerateOpts): Promise<LlmResult> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new LlmError("GEMINI_API_KEY não configurada.", PROVIDER, null, false);

    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: turnsToContents(opts.turns),
      generationConfig: { temperature: 0.3 },
    };
    if (opts.tools?.length) body.tools = [{ functionDeclarations: opts.tools }];

    let lastErr: unknown;
    for (const model of geminiModels()) {
      try {
        return await withRetry(
          () => callModel(model, key, body),
          RETRY_DELAYS_MS,
          (err, attempt) => console.warn(`[gemini] ${model}: tentativa ${attempt} falhou (${(err as Error).message}); repetindo…`)
        );
      } catch (err) {
        lastErr = err;
        const retryable = err instanceof LlmError ? err.retryable : true;
        if (!retryable) throw err; // chave inválida, payload ruim etc.: reserva não ajuda
        console.warn(`[gemini] ${model} esgotou as tentativas; tentando modelo reserva.`);
      }
    }
    throw lastErr instanceof Error ? lastErr : new LlmError(String(lastErr), PROVIDER, null, true);
  },
};
