import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { answersFromLead, computeScore } from "@/lib/scoring";
import LeadDetail from "@/components/LeadDetail";
import { getSession } from "@/lib/auth";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      responsavel: { select: { id: true, nome: true } },
      statusHistory: {
        orderBy: { criadoEm: "desc" },
        include: { usuario: { select: { nome: true } } },
      },
    },
  });
  if (!lead) notFound();

  const users = await prisma.user.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  // Recalcula o detalhamento por pergunta (valor, peso e subtotal) para exibição.
  // O score/classe persistidos são os da matriz da época; o detalhe só explica o cálculo.
  const { detalhe, scoreMaximo } = computeScore(answersFromLead(lead));

  // Serializa datas para o client component.
  const leadPlain = {
    ...lead,
    criadoEm: lead.criadoEm.toISOString(),
    atualizadoEm: lead.atualizadoEm.toISOString(),
    origemUtm: lead.origemUtm as Record<string, string> | null,
    statusHistory: lead.statusHistory.map((h) => ({
      id: h.id,
      statusAnterior: h.statusAnterior,
      statusNovo: h.statusNovo,
      observacao: h.observacao,
      usuario: h.usuario?.nome ?? null,
      criadoEm: h.criadoEm.toISOString(),
    })),
  };

  return (
    <LeadDetail
      lead={leadPlain}
      detalhe={detalhe}
      scoreMaximo={scoreMaximo}
      users={users}
      papel={session?.papel ?? "visualizador"}
    />
  );
}
