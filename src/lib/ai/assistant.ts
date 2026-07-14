// Orquestra a conversa com o Gemini: monta o contexto anonimizado dos leads,
// expõe as ferramentas (function calling) e executa as ações no banco com as
// mesmas travas de permissão/histórico das rotas normais.
import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import { STATUSES } from "@/lib/constants";
import { generateContent, type Content, type FunctionDeclaration } from "./gemini";
import { getPriorityLeads, anonymize } from "./priority";

export type ChatMsg = { role: "user" | "assistant"; content: string };
export type Action = {
  tipo: string;
  leadId: string;
  de?: string;
  para?: string;
  ok: boolean;
  erro?: string;
};

const STATUS_CODES = STATUSES.map((s) => s.code);

const TOOLS: FunctionDeclaration[] = [
  {
    name: "mudar_status",
    description:
      "Altera o status operacional de um lead e registra no histórico. Use SOMENTE depois que o usuário confirmar explicitamente a alteração.",
    parameters: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "O campo id do lead (vindo da lista de contexto)." },
        novo_status: {
          type: "string",
          enum: STATUS_CODES,
          description: "Código do novo status.",
        },
        observacao: { type: "string", description: "Motivo/observação opcional." },
      },
      required: ["lead_id", "novo_status"],
    },
  },
];

async function execMudarStatus(
  session: SessionUser,
  args: Record<string, unknown>
): Promise<Action> {
  const leadId = String(args.lead_id ?? "");
  const novo = String(args.novo_status ?? "");
  const obs = typeof args.observacao === "string" ? args.observacao : null;
  const base: Action = { tipo: "mudar_status", leadId, para: novo, ok: false };

  if (session.papel === "visualizador")
    return { ...base, erro: "Sem permissão (perfil visualizador não altera status)." };
  if (!STATUS_CODES.includes(novo)) return { ...base, erro: "Status inválido." };

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { status: true } });
  if (!lead) return { ...base, erro: "Lead não encontrado." };

  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { status: novo } }),
    prisma.leadStatusHistory.create({
      data: {
        leadId,
        statusAnterior: lead.status,
        statusNovo: novo,
        usuarioId: session.id,
        observacao: obs,
      },
    }),
  ]);
  return { ...base, de: lead.status, ok: true };
}

function buildSystem(ctx: string, papel: string): string {
  return `Você é o assistente de priorização de leads da clínica, dentro do painel "Qualifica Leads".
Fale sempre em português do Brasil, de forma objetiva, clara e amigável. Use listas curtas quando ajudar.
Seu papel: analisar os leads, destacar os prioritários (score ≥ 70%, classe A) que devem ser contatados agora, explicar o porquê em linguagem simples, e ajudar a operar o funil (mudar status).

REGRAS IMPORTANTES:
- Os dados abaixo são ANONIMIZADOS (sem nome, telefone ou e-mail). Refira-se a cada lead pelo procedimento, região e score. NUNCA invente nomes ou telefones — quem vê os nomes é a equipe, na própria tela.
- Para mudar o status use a ferramenta "mudar_status" passando o lead_id exato da lista. SEMPRE confirme com o usuário antes de chamar a ferramenta, a menos que ele já tenha dito claramente para fazer.
- Nunca dê aconselhamento médico nem opinião clínica. Você organiza o contato comercial, não avalia o caso de saúde.
- Status válidos: ${STATUSES.map((s) => `${s.code} = ${s.label}`).join("; ")}.
- Perfil do usuário atual: ${papel}${papel === "visualizador" ? " (NÃO pode alterar status)." : "."}

CONTEXTO ATUAL (dados anonimizados):
${ctx}`;
}

async function buildContext(): Promise<string> {
  const [total, mediaAgg, porClasse, priority] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.aggregate({ _avg: { scorePercentual: true } }),
    prisma.lead.groupBy({ by: ["classificacao"], _count: true }),
    getPriorityLeads(25),
  ]);
  const classeStr =
    porClasse.map((c) => `${c.classificacao}=${c._count}`).join(", ") || "sem dados";
  const media = Math.round((mediaAgg._avg.scorePercentual ?? 0) * 10) / 10;

  return [
    `Total de leads: ${total}. Média de score: ${media}%. Distribuição por classe: ${classeStr}.`,
    `Leads prioritários para contato agora (score ≥ 70% e ainda em aberto): ${priority.length}.`,
    "Lista dos prioritários em JSON:",
    JSON.stringify(anonymize(priority)),
  ].join("\n");
}

export async function runAssistant(
  history: ChatMsg[],
  session: SessionUser
): Promise<{ reply: string; actions: Action[] }> {
  const system = buildSystem(await buildContext(), session.papel);

  const contents: Content[] = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const actions: Action[] = [];
  // Loop de function calling: no máx. 4 rodadas para evitar laço infinito.
  for (let round = 0; round < 4; round++) {
    const result = await generateContent({ system, contents, tools: TOOLS });

    if (result.functionCalls.length === 0) {
      return { reply: result.text || "…", actions };
    }

    // Registra o turno do modelo com as partes CRUAS (preserva o
    // thoughtSignature que os modelos novos exigem no retorno da ferramenta).
    contents.push({ role: "model", parts: result.rawParts });

    const responseParts = [];
    for (const fc of result.functionCalls) {
      const action =
        fc.name === "mudar_status"
          ? await execMudarStatus(session, fc.args)
          : ({ tipo: fc.name, leadId: "", ok: false, erro: "Ferramenta desconhecida." } as Action);
      actions.push(action);
      responseParts.push({ functionResponse: { name: fc.name, response: { resultado: action } } });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return {
    reply: "Fiz as ações possíveis, mas a conversa ficou longa demais. Pode repetir o que faltou?",
    actions,
  };
}
