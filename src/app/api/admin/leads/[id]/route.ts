import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
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

  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  return NextResponse.json({ lead });
}

// Atualiza observações internas
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.papel === "visualizador")
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const observacoes = typeof body.observacoes === "string" ? body.observacoes : undefined;

  const lead = await prisma.lead.update({
    where: { id },
    data: { observacoesInternas: observacoes ?? null },
  });
  return NextResponse.json({ ok: true, lead });
}
