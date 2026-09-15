import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runAssistant, type ChatMsg } from "@/lib/ai/assistant";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const messages: ChatMsg[] = Array.isArray(body.messages)
    ? body.messages
        .slice(-20)
        .map((m: { role?: string; content?: unknown }) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content ?? ""),
        }))
        .filter((m: ChatMsg) => m.content.trim().length > 0)
    : [];

  if (messages.length === 0)
    return NextResponse.json({ error: "Nenhuma mensagem enviada." }, { status: 400 });

  try {
    const { reply, actions, provider } = await runAssistant(messages, session);
    return NextResponse.json({ reply, actions, provider });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[assistant]", msg);
    const friendly = msg.includes("Nenhuma chave de IA")
      ? "Nenhuma chave de IA configurada no servidor (GEMINI_API_KEY ou GROQ_API_KEY)."
      : "A IA ficou indisponível mesmo após várias tentativas. Tente novamente em instantes.";
    // `detail` só é visível para usuários autenticados do painel (ajuda no diagnóstico).
    return NextResponse.json({ error: friendly, detail: msg }, { status: 500 });
  }
}
