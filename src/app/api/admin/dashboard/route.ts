import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calcularFunil } from "@/lib/kpis";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  // KPIs fora do escore (seção 12). Média de score exclui registros incompletos.
  const [total, porClassificacao, agg, porProcedimento, porCanal, porDificuldade, porStatus] =
    await Promise.all([
      prisma.lead.count(),
      prisma.lead.groupBy({ by: ["classificacao"], _count: true }),
      prisma.lead.aggregate({
        _avg: { scorePercentual: true },
        where: { classificacao: { not: "incompleto" } },
      }),
      prisma.lead.groupBy({ by: ["procedimentoInteresse"], _count: true }),
      prisma.lead.groupBy({ by: ["canalOrigem"], _count: true }),
      prisma.lead.groupBy({ by: ["dificuldadeDecisao"], _count: true }),
      prisma.lead.groupBy({ by: ["status"], _count: true }),
    ]);

  // Taxas por próximo passo desejado
  const [querAgendar, apenasInfo, semContato] = await Promise.all([
    prisma.lead.count({ where: { proximoPasso: "agendar" } }),
    prisma.lead.count({ where: { proximoPasso: "informacoes_gerais" } }),
    prisma.lead.count({ where: { proximoPasso: "nao_contatar" } }),
  ]);

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);

  // Funil de atendimento (tempo até o 1º contato, agendamento, comparecimento, conversão).
  const leadsFunil = await prisma.lead.findMany({
    select: {
      criadoEm: true,
      status: true,
      classificacao: true,
      statusHistory: { select: { statusNovo: true, criadoEm: true } },
    },
  });
  const funil = calcularFunil(
    leadsFunil.map((l) => ({
      criadoEm: l.criadoEm,
      status: l.status,
      classificacao: l.classificacao,
      historico: l.statusHistory,
    }))
  );

  return NextResponse.json({
    total,
    mediaScore: Math.round((agg._avg.scorePercentual ?? 0) * 10) / 10,
    porClassificacao: porClassificacao.map((c) => ({
      classificacao: c.classificacao,
      total: c._count,
    })),
    porProcedimento: porProcedimento.map((c) => ({ code: c.procedimentoInteresse, total: c._count })),
    porCanal: porCanal.map((c) => ({ code: c.canalOrigem, total: c._count })),
    porDificuldade: porDificuldade.map((c) => ({ code: c.dificuldadeDecisao, total: c._count })),
    porStatus: porStatus.map((c) => ({ code: c.status, total: c._count })),
    taxas: {
      querAgendar: pct(querAgendar),
      apenasInfo: pct(apenasInfo),
      semContato: pct(semContato),
    },
    funil,
  });
}
