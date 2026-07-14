"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import { STATUS_LABEL, CLASSIFICACAO_BADGE } from "@/lib/constants";

type PriorityLead = {
  id: string;
  nome: string;
  whatsapp: string;
  cidadeEstado: string | null;
  score: number;
  classificacao: string;
  status: string;
  proximoPasso: string;
  procedimento: string;
  responsavel: string | null;
};

type Action = { tipo: string; leadId: string; de?: string; para?: string; ok: boolean; erro?: string };
type Msg = { role: "user" | "assistant"; content: string; hidden?: boolean; actions?: Action[] };

const SEED =
  "Faça uma análise geral dos meus leads e me diga, de forma resumida, quem eu devo priorizar e contatar agora e por quê.";

function waLink(whatsapp: string) {
  let d = whatsapp.replace(/\D/g, "");
  if (d.length <= 11) d = "55" + d; // assume Brasil se veio sem DDI
  return `https://wa.me/${d}`;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [priority, setPriority] = useState<PriorityLead[] | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  function loadPriority() {
    fetch("/api/admin/assistant/priority")
      .then((r) => r.json())
      .then((d) => setPriority(d.leads ?? []))
      .catch(() => setPriority([]));
  }

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    loadPriority();
    // análise inicial automática (mensagem-semente oculta)
    send(SEED, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string, hidden = false) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: trimmed, hidden }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError([data.error, data.detail].filter(Boolean).join(" — ") || "Erro ao consultar a IA.");
        setLoading(false);
        return;
      }
      setMessages([...next, { role: "assistant", content: data.reply, actions: data.actions }]);
      // se a IA mudou algum status, atualiza o painel de prioritários
      if ((data.actions ?? []).some((a: Action) => a.ok)) loadPriority();
    } catch {
      setError("Falha de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  const visible = messages.filter((m) => !m.hidden);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Assistente de leads</h1>
        <p className="text-sm text-ink-500">
          Análise inteligente dos seus leads e ações por conversa. Dados enviados à IA são anonimizados.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* CHAT */}
        <div className="card flex h-[70vh] flex-col lg:col-span-2">
          <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-5">
            {visible.length === 0 && !loading && (
              <p className="text-sm text-ink-400">Iniciando análise dos seus leads…</p>
            )}
            {visible.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white"
                      : "max-w-[90%] rounded-2xl rounded-bl-sm bg-ink-50 px-4 py-2.5 text-sm text-ink-800 ring-1 ring-ink-100"
                  }
                >
                  {m.role === "assistant" ? (
                    <Markdown content={m.content} />
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  )}
                  {m.actions
                    ?.filter((a) => a.tipo === "mudar_status")
                    .map((a, j) => (
                      <p
                        key={j}
                        className={`mt-2 rounded-lg px-2 py-1 text-xs font-medium ${
                          a.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {a.ok
                          ? `✓ Status alterado para "${STATUS_LABEL[a.para ?? ""] ?? a.para}".`
                          : `✗ Não alterei o status: ${a.erro}`}
                      </p>
                    ))}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-ink-50 px-4 py-2.5 text-sm text-ink-400 ring-1 ring-ink-100">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce">•</span>
                    <span className="animate-bounce [animation-delay:0.15s]">•</span>
                    <span className="animate-bounce [animation-delay:0.3s]">•</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="mx-5 mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
          )}

          <form
            className="flex items-center gap-2 border-t border-ink-100 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              className="input"
              placeholder='Ex.: "marque o lead de mamoplastia como contato realizado"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn-primary shrink-0" disabled={loading || !input.trim()}>
              Enviar
            </button>
          </form>
        </div>

        {/* PAINEL DE PRIORITÁRIOS (nomes reais, não passam pela IA) */}
        <div className="card flex h-[70vh] flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-800">Contatar agora</h2>
            <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-200">
              {priority?.length ?? "…"}
            </span>
          </div>
          <p className="mb-3 text-xs text-ink-400">Score ≥ 70% e ainda em aberto.</p>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {priority === null && <p className="text-sm text-ink-400">Carregando…</p>}
            {priority?.length === 0 && (
              <p className="text-sm text-ink-400">Nenhum lead prioritário em aberto no momento. 🎉</p>
            )}
            {priority?.map((l) => (
              <div key={l.id} className="rounded-xl ring-1 ring-ink-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/leads/${l.id}`}
                    className="truncate text-sm font-medium text-ink-900 hover:text-brand-700"
                  >
                    {l.nome}
                  </Link>
                  <span
                    className={`badge ring-1 ${CLASSIFICACAO_BADGE[l.classificacao] ?? "bg-ink-100 text-ink-700 ring-ink-200"}`}
                  >
                    {l.score}%
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-500">
                  {l.procedimento}
                  {l.cidadeEstado ? ` · ${l.cidadeEstado}` : ""}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-ink-400">{STATUS_LABEL[l.status] ?? l.status}</span>
                  <a
                    href={waLink(l.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    WhatsApp →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
