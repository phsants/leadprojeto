// Migração de dados para a matriz v1.0 (documento técnico-funcional v2).
// Preenche, nos registros antigos, os campos de rastreabilidade novos:
//   classificacao_por_score, override_reason, matrix_version, e renomeia a flag
//   lead_informativo -> lead_educacional. NÃO altera score_total nem a classe
//   final já gravada (resultados históricos são preservados).
// Idempotente: só toca em leads com classificacao_por_score nula ou flag antiga.
// Roda no start do container (docker-entrypoint.sh) e pode ser executado à mão:
//   npx tsx prisma/backfill-matrix-v1.ts
import { PrismaClient } from "@prisma/client";
import { answersFromLead, computeScore, MATRIX_VERSION } from "../src/lib/scoring";

const prisma = new PrismaClient();

async function main() {
  const pendentes = await prisma.lead.findMany({
    where: {
      OR: [{ classificacaoPorScore: null }, { flags: { has: "lead_informativo" } }],
    },
  });
  if (pendentes.length === 0) {
    console.log("✔ Backfill matriz v1.0: nada a fazer.");
    return;
  }

  let atualizados = 0;
  let divergentes = 0;
  for (const lead of pendentes) {
    const r = computeScore(answersFromLead(lead));
    const flags = lead.flags.map((f) => (f === "lead_informativo" ? "lead_educacional" : f));

    // Auditoria: se o motor v1.0 discorda da classe final gravada, registra no log,
    // mas preserva o valor histórico (o documento proíbe alterar resultados passados).
    if (r.classificacaoFinal !== lead.classificacao || r.scoreTotal !== lead.scoreTotal) {
      divergentes++;
      console.warn(
        `⚠ lead ${lead.id}: gravado ${lead.scoreTotal}pts/${lead.classificacao}, motor v1.0 => ${r.scoreTotal}pts/${r.classificacaoFinal} (mantido o histórico)`
      );
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        matrixVersion: lead.matrixVersion || MATRIX_VERSION,
        classificacaoPorScore: lead.classificacaoPorScore ?? r.classificacaoPorScore,
        overrideReason: lead.overrideReason ?? r.overrideReason,
        flags,
        recomendacao: lead.classificacao === r.classificacaoFinal ? r.recomendacao : lead.recomendacao,
      },
    });
    atualizados++;
  }
  console.log(`✔ Backfill matriz v1.0: ${atualizados} lead(s) atualizado(s), ${divergentes} divergência(s) só logada(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
