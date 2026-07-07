"use client";

import { useEffect, useMemo, useState } from "react";
import { getQuestion, getOptionLabel, SCORE_MAXIMO } from "@/lib/form-schema";

type Rule = {
  id: string;
  campo: string;
  resposta: string;
  valor: number;
  peso: number;
  ativo: boolean;
};

export default function ScoringRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/scoring-rules")
      .then((r) => r.json())
      .then((d) => setRules(d.rules ?? []))
      .finally(() => setLoading(false));
  }, []);

  const grupos = useMemo(() => {
    const by: Record<string, Rule[]> = {};
    for (const r of rules) (by[r.campo] ??= []).push(r);
    return Object.entries(by);
  }, [rules]);

  function updateValor(id: string, valor: number) {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, valor } : r)));
  }
  function updatePeso(campo: string, peso: number) {
    setRules((rs) => rs.map((r) => (r.campo === campo ? { ...r, peso } : r)));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/scoring-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rules: rules.map((r) => ({ id: r.id, valor: r.valor, peso: r.peso, ativo: r.ativo })),
      }),
    });
    setSaving(false);
    if (res.ok) setMsg("Pesos atualizados com sucesso.");
    else {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error || "Falha ao salvar (apenas administradores podem alterar).");
    }
  }

  if (loading) return <p className="text-ink-500">Carregando...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Configuração de pesos</h1>
          <p className="text-sm text-ink-500">
            Altere pesos e valores sem mexer no código. Score máximo atual de referência: {SCORE_MAXIMO} pontos.
          </p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      {msg && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700 ring-1 ring-brand-100">{msg}</p>
      )}

      <div className="space-y-4">
        {grupos.map(([campo, rs]) => {
          const q = getQuestion(campo);
          return (
            <div key={campo} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-800">
                  {q ? `${q.numero}. ${q.titulo}` : campo}
                </h2>
                <label className="flex items-center gap-2 text-sm text-ink-600">
                  Peso da pergunta:
                  <input
                    type="number"
                    min={0}
                    max={10}
                    className="input w-20 py-1.5 text-center"
                    value={rs[0]?.peso ?? 0}
                    onChange={(e) => updatePeso(campo, Number(e.target.value))}
                  />
                </label>
              </div>
              <div className="divide-y divide-ink-50">
                {rs
                  .slice()
                  .sort((a, b) => b.valor - a.valor)
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2">
                      <span className="text-sm text-ink-600">{getOptionLabel(campo, r.resposta)}</span>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        className="input w-20 py-1.5 text-center"
                        value={r.valor}
                        onChange={(e) => updateValor(r.id, Number(e.target.value))}
                      />
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
