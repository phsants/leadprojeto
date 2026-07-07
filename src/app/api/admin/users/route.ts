import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const users = await prisma.user.findMany({
    select: { id: true, nome: true, papel: true },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json({ users });
}
