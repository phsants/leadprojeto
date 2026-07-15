"use client";

// Tela SOMENTE LEITURA do mapeamento de pontuação. A edição de pesos foi
// removida de propósito: o mapeamento está validado e não deve ser alterado
// por engano (fonte da verdade em src/lib/form-schema.ts).

import { QUESTIONS, SCORED_QUESTIONS, SCORE_MAXIMO } from "@/lib/form-schema";

export default function ScoringMapPage() {
  const naoPontuam = QUESTIONS.filter((q) => !q.pontua);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Mapeamento de pontuação</h1>
        <p className="text-sm text-ink-500">
          Como cada resposta soma pontos. Configuração fixa e validada — score máximo de{" "}
          <span className="font-semibold text-ink-700">{SCORE_MAXIMO} pontos</span> (100%).
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M9.9 3.6l-6.3 10.9A2 2 0 0 0 5.3 17.5h13.4a2 2 0 0 0 1.7-3L14.1 3.6a2.4 2.4 0 0 0-4.2 0Z" />
        </svg>
        Pontuação bloqueada para edição. Assim ninguém altera os pesos por engano e o cálculo dos leads continua consistente.
      </div>

      <div className="space-y-4">
        {SCORED_QUESTIONS.map((q) => {
          const maxValor = Math.max(...q.options.map((o) => o.valor ?? 0));
          return (
            <div key={q.campo} className="card p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink-800">
                  {q.numero}. {q.titulo}
                </h2>
                <span className="badge shrink-0 bg-brand-50 text-brand-700 ring-brand-100">
                  Peso {q.peso} · máx {q.peso * maxValor} pts
                </span>
              </div>
              <div className="divide-y divide-ink-50">
                {q.options
                  .slice()
                  .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))
                  .map((o) => (
                    <div key={o.code} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-sm text-ink-600">{o.label}</span>
                      <span className="flex items-center gap-3 text-sm">
                        <span className="text-ink-400">valor {o.valor ?? 0}</span>
                        <span className="w-16 text-right font-semibold text-ink-800">
                          {q.peso * (o.valor ?? 0)} pts
                        </span>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink-800">Perguntas que não pontuam</h2>
        <p className="mb-3 text-xs text-ink-400">
          Usadas apenas para segmentação e análise — não entram no cálculo do score.
        </p>
        <div className="flex flex-wrap gap-2">
          {naoPontuam.map((q) => (
            <span key={q.campo} className="badge bg-ink-100 text-ink-600 ring-ink-200">
              {q.numero}. {q.titulo}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
