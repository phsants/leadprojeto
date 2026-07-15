import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseCsv, rowsToLeads } from "@/lib/import-map";
import { computeScore } from "@/lib/scoring";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.papel === "visualizador")
    return NextResponse.json({ error: "Sem permissão para importar." }, { status: 403 });

  // Aceita upload multipart (campo "file") ou o CSV cru no corpo.
  let text = "";
  const ctype = req.headers.get("content-type") || "";
  try {
    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (file && typeof file !== "string") text = await file.text();
    } else {
      text = await req.text();
    }
  } catch {
    /* ignore */
  }

  if (!text.trim())
    return NextResponse.json({ error: "Arquivo vazio ou não enviado." }, { status: 400 });

  const { headers, rows } = parseCsv(text);
  if (rows.length === 0)
    return NextResponse.json({ error: "Nenhuma linha de dados encontrada no arquivo." }, { status: 400 });

  const { leads, ignoredColumns, matchedFields } = rowsToLeads(headers, rows);

  // Regras de pontuação do banco (mesmo motor do formulário público).
  const rules = await prisma.scoringRule.findMany({ where: { ativo: true } });

  const data = leads.map((l) => {
    const s = computeScore(l.answers, rules);
    return {
      nome: l.nome || "Sem nome",
      whatsapp: l.whatsapp || "",
      email: l.email || null,
      cidadeEstado: l.cidade_estado || null,

      procedimentoInteresse: l.answers.procedimento_interesse || "",
      procedimentoOutro: null,
      clarezaDemanda: l.answers.clareza_demanda || "",
      momentoAtual: l.answers.momento_atual || "",
      tempoConsulta: l.answers.tempo_consulta || "",
      tempoCirurgia: l.answers.tempo_cirurgia || "",
      disponibilidadePresencial: l.answers.disponibilidade_presencial || "",
      contatoAnterior: l.answers.contato_anterior || "",
      dificuldadeDecisao: l.answers.dificuldade_decisao || "",
      dificuldadeOutro: null,
      canalOrigem: l.answers.canal_origem || "",
      canalOrigemOutro: null,
      proximoPasso: l.answers.proximo_passo || "",

      scoreTotal: s.scoreTotal,
      scorePercentual: s.scorePercentual,
      classificacao: s.classificacao,
      recomendacao: s.recomendacao,
      flags: s.flags,

      status: "novo",
      consentimentoContato: false,
      consentimentoPrivacidade: false,
    };
  });

  const result = await prisma.lead.createMany({ data });

  return NextResponse.json({
    ok: true,
    imported: result.count,
    totalRows: rows.length,
    matchedFields,
    ignoredColumns,
  });
}
