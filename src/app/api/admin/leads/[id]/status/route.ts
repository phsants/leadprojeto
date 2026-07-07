import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { STATUSES } from "@/lib/constants";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.papel === "visualizador")
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const novoStatus = String(body.status ?? "");
  const observacao = typeof body.observacao === "string" ? body.observacao : null;

  if (!STATUSES.some((s) => s.code === novoStatus)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 422 });
  }

  const lead = await prisma.lead.findUnique({ where: { id }, select: { status: true } });
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  const [updated] = await prisma.$transaction([
    prisma.lead.update({ where: { id }, data: { status: novoStatus } }),
    prisma.leadStatusHistory.create({
      data: {
        leadId: id,
        statusAnterior: lead.status,
        statusNovo: novoStatus,
        usuarioId: session.id,
        observacao,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, lead: updated });
}
