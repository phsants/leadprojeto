import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseCsv, rowsToLeads } from "@/lib/import-map";
import { camposFaltantes, computeScore } from "@/lib/scoring";

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

  // Ordem obrigatória (seção 7): 1–2 validar obrigatórios/consentimentos —
  // importação incompleta NÃO é rejeitada: recebe "Lead incompleto" (sem classe A–D).
  let incompletos = 0;
  const data = leads.map((l) => {
    const faltantes = camposFaltantes({
      nome: l.nome,
      whatsapp: l.whatsapp,
      consentimentoContato: l.consentimento_contato,
      consentimentoPrivacidade: l.consentimento_privacidade,
      answers: l.answers,
    });
    if (faltantes.length > 0) incompletos++;
    const s = computeScore(l.answers, { camposFaltantes: faltantes });
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

      matrixVersion: s.matrixVersion,
      scoreTotal: s.scoreTotal,
      scorePercentual: s.scorePercentual,
      classificacaoPorScore: s.classificacaoPorScore,
      classificacao: s.classificacaoFinal,
      overrideReason: s.overrideReason,
      recomendacao: s.recomendacao,
      flags: s.flags,

      status: "novo",
      consentimentoContato: l.consentimento_contato,
      consentimentoPrivacidade: l.consentimento_privacidade,
    };
  });

  const result = await prisma.lead.createMany({ data });

  return NextResponse.json({
    ok: true,
    imported: result.count,
    incompletos,
    totalRows: rows.length,
    matchedFields,
    ignoredColumns,
  });
}
