import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { QUESTIONS } from "@/lib/form-schema";

function cell(v: string): string {
  return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// Gera um CSV modelo com as colunas reconhecidas e uma linha de exemplo.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const headers = ["Nome", "WhatsApp", "Email", "Cidade/Estado", ...QUESTIONS.map((q) => q.titulo)];

  // Exemplo: para perguntas pontuadas, usa a opção de maior valor; senão a 1ª.
  const exemplo = ["Maria Exemplo", "11999998888", "maria@email.com", "São Paulo/SP"];
  for (const q of QUESTIONS) {
    const best = q.pontua
      ? q.options.slice().sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))[0]
      : q.options[0];
    exemplo.push(best?.label ?? "");
  }

  const csv =
    "﻿" + [headers, exemplo].map((r) => r.map(cell).join(";")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-importacao-leads.csv"',
    },
  });
}
