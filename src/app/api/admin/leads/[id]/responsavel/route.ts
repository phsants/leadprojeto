import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.papel === "visualizador")
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const responsavelId = body.responsavelId ? String(body.responsavelId) : null;

  if (responsavelId) {
    const exists = await prisma.user.findUnique({ where: { id: responsavelId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Responsável inválido." }, { status: 422 });
  }

  const lead = await prisma.lead.update({ where: { id }, data: { responsavelId } });
  return NextResponse.json({ ok: true, lead });
}
