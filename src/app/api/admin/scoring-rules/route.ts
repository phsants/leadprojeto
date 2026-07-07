import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const rules = await prisma.scoringRule.findMany({
    orderBy: [{ campo: "asc" }, { valor: "desc" }],
  });
  return NextResponse.json({ rules });
}

const putSchema = z.object({
  rules: z.array(
    z.object({
      id: z.string(),
      valor: z.number().int().min(0).max(10),
      peso: z.number().int().min(0).max(10),
      ativo: z.boolean().optional(),
    })
  ),
});

// Atualiza pesos e valores — apenas admin (seção 16).
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.papel !== "admin")
    return NextResponse.json({ error: "Apenas administradores podem alterar pesos." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });

  await prisma.$transaction(
    parsed.data.rules.map((r) =>
      prisma.scoringRule.update({
        where: { id: r.id },
        data: { valor: r.valor, peso: r.peso, ativo: r.ativo ?? true },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
