import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const where: Prisma.LeadWhereInput = {};

  const classificacao = searchParams.get("classificacao");
  if (classificacao && ["A", "B", "C", "D"].includes(classificacao)) {
    where.classificacao = classificacao as Prisma.LeadWhereInput["classificacao"];
  }

  const procedimento = searchParams.get("procedimento");
  if (procedimento) where.procedimentoInteresse = procedimento;

  const canal = searchParams.get("canal");
  if (canal) where.canalOrigem = canal;

  const status = searchParams.get("status");
  if (status) where.status = status;

  const responsavel = searchParams.get("responsavel");
  if (responsavel) where.responsavelId = responsavel;

  const flag = searchParams.get("flag");
  if (flag) where.flags = { has: flag };

  const dataDe = searchParams.get("de");
  const dataAte = searchParams.get("ate");
  if (dataDe || dataAte) {
    where.criadoEm = {};
    if (dataDe) (where.criadoEm as Prisma.DateTimeFilter).gte = new Date(dataDe);
    if (dataAte) (where.criadoEm as Prisma.DateTimeFilter).lte = new Date(dataAte + "T23:59:59");
  }

  const q = searchParams.get("q");
  if (q) {
    where.OR = [
      { nome: { contains: q, mode: "insensitive" } },
      { whatsapp: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    include: { responsavel: { select: { id: true, nome: true } } },
    // Ordenação padrão: maior score primeiro, depois mais recente.
    orderBy: [{ scorePercentual: "desc" }, { criadoEm: "desc" }],
    take: 500,
  });

  return NextResponse.json({ leads });
}
