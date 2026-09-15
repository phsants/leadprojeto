// Testes dos conversores de transcript (neutro -> Gemini / Groq) e da retentativa.
// Não chamam a rede. Rode com: npm test
import assert from "node:assert/strict";
import { LlmError, withRetry, isRetryableStatus, type Turn } from "../src/lib/ai/provider";

// "server-only" lança fora do Next; neutraliza o módulo antes de importar os provedores.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require.cache[require.resolve("server-only")] = { exports: {} } as never;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { turnsToContents } = require("../src/lib/ai/gemini") as typeof import("../src/lib/ai/gemini");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { turnsToMessages, toolsToOpenAi } = require("../src/lib/ai/groq") as typeof import("../src/lib/ai/groq");

let passed = 0;
function test(nome: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✔ ${nome}`);
    })
    .catch((e) => {
      console.error(`  ✘ ${nome}`);
      throw e;
    });
}

const turns: Turn[] = [
  { role: "user", text: "quem devo contatar?" },
  {
    role: "assistant",
    text: "",
    toolCalls: [{ id: "c1", name: "mudar_status", args: { lead_id: "L1", novo_status: "contato_realizado" } }],
    raw: { provider: "gemini", parts: [{ functionCall: { name: "mudar_status", args: { lead_id: "L1" } }, thoughtSignature: "abc" }] },
  },
  { role: "tool", results: [{ id: "c1", name: "mudar_status", result: { resultado: { ok: true } } }] },
];

(async () => {
  console.log("Provedores de IA");

  await test("Gemini reaproveita partes cruas (thoughtSignature) do próprio turno", () => {
    const c = turnsToContents(turns);
    assert.equal(c.length, 3);
    assert.equal(c[0].role, "user");
    assert.equal(c[1].role, "model");
    assert.ok("thoughtSignature" in (c[1].parts[0] as Record<string, unknown>));
    assert.equal(c[2].role, "user");
    assert.deepEqual(c[2].parts[0], { functionResponse: { name: "mudar_status", response: { resultado: { ok: true } } } });
  });

  await test("Gemini reconstrói turno gerado por OUTRO provedor sem usar partes cruas", () => {
    const t: Turn[] = [{ ...turns[1], raw: { provider: "groq", parts: [] } } as Turn];
    const c = turnsToContents(t);
    assert.deepEqual(c[0].parts, [{ functionCall: { name: "mudar_status", args: { lead_id: "L1", novo_status: "contato_realizado" } } }]);
  });

  await test("Groq converte para mensagens OpenAI com tool_calls e role tool", () => {
    const m = turnsToMessages("SYS", turns);
    assert.equal(m[0].role, "system");
    assert.equal(m[1].role, "user");
    const a = m[2] as { role: string; content: string | null; tool_calls?: { id: string; function: { arguments: string } }[] };
    assert.equal(a.role, "assistant");
    assert.equal(a.content, null);
    assert.equal(a.tool_calls?.[0].id, "c1");
    assert.deepEqual(JSON.parse(a.tool_calls![0].function.arguments), { lead_id: "L1", novo_status: "contato_realizado" });
    const tr = m[3] as { role: string; tool_call_id: string; content: string };
    assert.equal(tr.role, "tool");
    assert.equal(tr.tool_call_id, "c1");
    assert.deepEqual(JSON.parse(tr.content), { resultado: { ok: true } });
  });

  await test("declaração de ferramenta vira formato OpenAI", () => {
    const t = toolsToOpenAi([{ name: "x", description: "d", parameters: { type: "object", properties: {} } }]);
    assert.equal(t[0].type, "function");
    assert.equal(t[0].function.name, "x");
  });

  await test("status 503/429/500 são transitórios; 400/401/404 não", () => {
    for (const s of [503, 429, 500, 502]) assert.ok(isRetryableStatus(s), String(s));
    for (const s of [400, 401, 403, 404]) assert.ok(!isRetryableStatus(s), String(s));
  });

  await test("withRetry repete erro transitório e devolve sucesso", async () => {
    let calls = 0;
    const r = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new LlmError("503", "gemini", 503, true);
        return "ok";
      },
      [1, 1]
    );
    assert.equal(r, "ok");
    assert.equal(calls, 3);
  });

  await test("withRetry não repete erro definitivo (chave inválida)", async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(async () => {
        calls++;
        throw new LlmError("401", "gemini", 401, false);
      }, [1, 1]),
      /401/
    );
    assert.equal(calls, 1);
  });

  await test("withRetry desiste após esgotar as tentativas", async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(async () => {
        calls++;
        throw new LlmError("503", "gemini", 503, true);
      }, [1, 1]),
      /503/
    );
    assert.equal(calls, 3);
  });

  console.log(`\n${passed} teste(s) OK`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
