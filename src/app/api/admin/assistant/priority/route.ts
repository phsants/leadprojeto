import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPriorityLeads } from "@/lib/ai/priority";

// Lista de prioritários COM nomes reais — renderizada direto na tela da equipe.
// Estes dados NÃO passam pela IA (só ficam no seu servidor + navegador).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const leads = await getPriorityLeads(25);
  return NextResponse.json({ leads });
}
