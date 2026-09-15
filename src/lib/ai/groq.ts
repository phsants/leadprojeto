// Provedor Groq (chat/completions, compatível com OpenAI) com function calling.
// Chave via env GROQ_API_KEY (plano gratuito em console.groq.com). Usado como
// reserva quando o Gemini falha, ou sozinho se só ele estiver configurado.
import "server-only";
import {
  LlmError,
  isRetryableStatus,
  withRetry,
  type GenerateOpts,
  type LlmProvider,
  type LlmResult,
  type ToolCall,
  type ToolDeclaration,
  type Turn,
} from "./provider";

const URL = "https://api.groq.com/openai/v1/chat/completions";
const PROVIDER = "groq";

export function groqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}

export function groqModel(): string {
  return process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}

export type OpenAiToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type OpenAiMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

/** Converte a conversa neutra para mensagens no formato OpenAI. */
export function turnsToMessages(system: string, turns: Turn[]): OpenAiMessage[] {
  const out: OpenAiMessage[] = [{ role: "system", content: system }];
  for (const t of turns) {
    if (t.role === "user") {
      out.push({ role: "user", content: t.text });
    } else if (t.role === "assistant") {
      const msg: OpenAiMessage = { role: "assistant", content: t.text || null };
      if (t.toolCalls.length) {
        msg.tool_calls = t.toolCalls.map((c) => ({
          id: c.id,
          type: "function",
          function: { name: c.name, arguments: JSON.stringify(c.args ?? {}) },
        }));
      }
      out.push(msg);
    } else {
      for (const r of t.results) {
        out.push({ role: "tool", tool_call_id: r.id, content: JSON.stringify(r.result ?? {}) });
      }
    }
  }
  return out;
}

export function toolsToOpenAi(tools: ToolDeclaration[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

async function callModel(model: string, key: string, body: unknown): Promise<LlmResult> {
  let res: Response;
  try {
    res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    throw new LlmError(`Groq rede (modelo: ${model}): ${(e as Error).message}`, PROVIDER, null, true);
  }

  if (!res.ok) {
    const errText = await res.text();
    let detail = errText.slice(0, 600);
    try {
      const j = JSON.parse(errText);
      if (j?.error?.message) detail = String(j.error.message);
    } catch {
      /* texto cru */
    }
    throw new LlmError(`Groq ${res.status} (modelo: ${model}): ${detail}`, PROVIDER, res.status, isRetryableStatus(res.status));
  }

  const data = await res.json();
  const msg = data?.choices?.[0]?.message ?? {};
  const text = typeof msg.content === "string" ? msg.content.trim() : "";
  const rawCalls: { id?: string; function?: { name?: string; arguments?: string } }[] = Array.isArray(msg.tool_calls)
    ? msg.tool_calls
    : [];
  const toolCalls: ToolCall[] = rawCalls.map((tc, i) => {
    let args: Record<string, unknown> = {};
    try {
      args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
    } catch {
      /* argumentos inválidos => objeto vazio */
    }
    return { id: tc.id || `groq_${i}`, name: tc.function?.name ?? "", args };
  });

  return { text, toolCalls, raw: { provider: PROVIDER, parts: rawCalls } };
}

const RETRY_DELAYS_MS = [700, 1800];

export const groqProvider: LlmProvider = {
  name: PROVIDER,
  async generate(opts: GenerateOpts): Promise<LlmResult> {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new LlmError("GROQ_API_KEY não configurada.", PROVIDER, null, false);
    const model = groqModel();

    const body: Record<string, unknown> = {
      model,
      temperature: 0.3,
      messages: turnsToMessages(opts.system, opts.turns),
    };
    if (opts.tools?.length) {
      body.tools = toolsToOpenAi(opts.tools);
      body.tool_choice = "auto";
    }

    return withRetry(
      () => callModel(model, key, body),
      RETRY_DELAYS_MS,
      (err, attempt) => console.warn(`[groq] ${model}: tentativa ${attempt} falhou (${(err as Error).message}); repetindo…`)
    );
  },
};
