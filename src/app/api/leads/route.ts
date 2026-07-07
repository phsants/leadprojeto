import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leadFormSchema } from "@/lib/validation";
import { computeScore } from "@/lib/scoring";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = leadFormSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return NextResponse.json(
      { error: first?.message ?? "Dados inválidos.", field: first?.path?.join(".") },
      { status: 422 }
    );
  }
  const data = parsed.data;

  // Carrega regras de pontuação do banco (fallback interno para a config)
  const rules = await prisma.scoringRule.findMany({ where: { ativo: true } });
  const result = computeScore(data as unknown as Record<string, string>, rules);

  await prisma.lead.create({
    data: {
      nome: data.nome,
      whatsapp: data.whatsapp,
      email: data.email || null,
      cidadeEstado: data.cidade_estado || null,

      procedimentoInteresse: data.procedimento_interesse,
      procedimentoOutro: data.procedimento_outro || null,
      clarezaDemanda: data.clareza_demanda,
      momentoAtual: data.momento_atual,
      tempoConsulta: data.tempo_consulta,
      tempoCirurgia: data.tempo_cirurgia,
      disponibilidadePresencial: data.disponibilidade_presencial,
      contatoAnterior: data.contato_anterior,
      dificuldadeDecisao: data.dificuldade_decisao,
      dificuldadeOutro: data.dificuldade_outro || null,
      canalOrigem: data.canal_origem,
      canalOrigemOutro: data.canal_origem_outro || null,
      proximoPasso: data.proximo_passo,

      scoreTotal: result.scoreTotal,
      scorePercentual: result.scorePercentual,
      classificacao: result.classificacao,
      recomendacao: result.recomendacao,
      flags: result.flags,

      status: "novo",
      consentimentoContato: data.consentimento_contato,
      consentimentoPrivacidade: data.consentimento_privacidade,
      origemUtm: data.origem_utm ?? undefined,
    },
  });

  // Mensagem neutra — NÃO retorna score/classificação ao lead (seção 11).
  return NextResponse.json({
    ok: true,
    message:
      "Obrigado pelo preenchimento. Suas respostas ajudarão nossa equipe a organizar melhor o atendimento inicial.",
  });
}
