import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getOptionLabel } from "@/lib/form-schema";
import { STATUS_LABEL } from "@/lib/constants";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.papel === "visualizador")
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const leads = await prisma.lead.findMany({
    include: { responsavel: { select: { nome: true } } },
    orderBy: [{ classificacao: "asc" }, { criadoEm: "desc" }],
  });

  const headers = [
    "Data",
    "Nome",
    "WhatsApp",
    "Email",
    "Cidade/UF",
    "Procedimento",
    "Score",
    "Score %",
    "Classificacao",
    "Status",
    "Responsavel",
    "Canal origem",
    "Proximo passo",
    "Flags",
  ];

  const rows = leads.map((l) => [
    l.criadoEm.toISOString(),
    l.nome,
    l.whatsapp,
    l.email ?? "",
    l.cidadeEstado ?? "",
    getOptionLabel("procedimento_interesse", l.procedimentoInteresse),
    l.scoreTotal,
    l.scorePercentual,
    l.classificacao,
    STATUS_LABEL[l.status] ?? l.status,
    l.responsavel?.nome ?? "",
    getOptionLabel("canal_origem", l.canalOrigem),
    getOptionLabel("proximo_passo", l.proximoPasso),
    l.flags.join(" | "),
  ]);

  // Separador ";" e BOM para abrir corretamente no Excel em pt-BR.
  const csv =
    "﻿" +
    [headers, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
