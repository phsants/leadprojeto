// Contrato neutro entre o assistente e os provedores de LLM (Gemini, Groq).
// O assistente guarda a conversa como `Turn[]`; cada provedor converte para o
// seu formato. Assim dá para trocar de provedor no meio do laço de ferramentas.
// Sem "server-only" aqui para os conversores poderem ser testados com tsx.

export type ToolCall = { id: string; name: string; args: Record<string, unknown> };
export type ToolResult = { id: string; name: string; result: Record<string, unknown> };

export type Turn =
  | { role: "user"; text: string }
  | {
      role: "assistant";
      text: string;
      toolCalls: ToolCall[];
      /** partes cruas do provedor que gerou o turno (Gemini reaproveita o thoughtSignature) */
      raw?: { provider: string; parts: unknown[] };
    }
  | { role: "tool"; results: ToolResult[] };

export type ToolDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type LlmResult = {
  text: string;
  toolCalls: ToolCall[];
  raw?: { provider: string; parts: unknown[] };
};

export type GenerateOpts = {
  system: string;
  turns: Turn[];
  tools?: ToolDeclaration[];
};

export interface LlmProvider {
  readonly name: string;
  generate(opts: GenerateOpts): Promise<LlmResult>;
}

/** Erro de provedor com indicação de ser transitório (vale tentar de novo / trocar de provedor). */
export class LlmError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly status: number | null,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "LlmError";
  }
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Executa `fn` com retentativas exponenciais para erros transitórios.
 * `delaysMs` = esperas entre tentativas (n tentativas = delays.length + 1).
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  delaysMs: number[],
  onRetry?: (err: unknown, attempt: number) => void
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof LlmError ? err.retryable : true; // falha de rede também é transitória
      if (!retryable || attempt === delaysMs.length) throw err;
      onRetry?.(err, attempt + 1);
      await sleep(delaysMs[attempt]);
    }
  }
  throw lastErr;
}
