// Seleção dos leads prioritários (score alto e ainda em aberto) e sua
// versão anonimizada para enviar ao LLM (sem nome/telefone/e-mail).
import "server-only";
import { prisma } from "@/lib/prisma";
import { getOptionLabel } from "@/lib/form-schema";

// Status em que ainda faz sentido acionar o lead comercialmente.
export const OPEN_STATUSES = [
  "novo",
  "contato_realizado",
  "aguardando_resposta",
  "nao_compareceu",
];

export type PriorityLead = {
  id: string;
  nome: string;
  whatsapp: string;
  cidadeEstado: string | null;
  score: number;
  classificacao: string;
  status: string;
  proximoPasso: string;
  procedimento: string;
  responsavel: string | null;
};

export async function getPriorityLeads(limit = 25): Promise<PriorityLead[]> {
  const leads = await prisma.lead.findMany({
    where: {
      scorePercentual: { gte: 70 },
      status: { in: OPEN_STATUSES },
      proximoPasso: { not: "nao_contatar" },
      NOT: { flags: { has: "nao_acionar_comercialmente" } },
    },
    include: { responsavel: { select: { nome: true } } },
    orderBy: [{ scorePercentual: "desc" }, { criadoEm: "desc" }],
    take: limit,
  });

  return leads.map((l) => ({
    id: l.id,
    nome: l.nome,
    whatsapp: l.whatsapp,
    cidadeEstado: l.cidadeEstado,
    score: Math.round(l.scorePercentual * 10) / 10,
    classificacao: l.classificacao,
    status: l.status,
    proximoPasso: l.proximoPasso,
    procedimento: getOptionLabel("procedimento_interesse", l.procedimentoInteresse),
    responsavel: l.responsavel?.nome ?? null,
  }));
}

/** Remove identificadores diretos antes de enviar ao LLM. Mantém o id (opaco) para permitir ações. */
export function anonymize(leads: PriorityLead[]) {
  return leads.map((l) => ({
    id: l.id,
    score: l.score,
    classe: l.classificacao,
    regiao: l.cidadeEstado ?? "—",
    procedimento: l.procedimento,
    proximo_passo: l.proximoPasso,
    status: l.status,
    responsavel: l.responsavel ?? "sem responsável",
  }));
}
