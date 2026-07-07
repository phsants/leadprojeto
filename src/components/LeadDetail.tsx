"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QUESTIONS, getOptionLabel } from "@/lib/form-schema";
import {
  CLASSIFICACAO_BADGE,
  CLASSIFICACAO_LABEL,
  FLAG_LABEL,
  STATUS_LABEL,
  STATUSES,
} from "@/lib/constants";

type Detalhe = {
  campo: string;
  titulo: string;
  resposta: string;
  valor: number;
  peso: number;
  pontuacao: number;
}[];

type LeadPlain = {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  cidadeEstado: string | null;
  procedimentoInteresse: string;
  procedimentoOutro: string | null;
  dificuldadeOutro: string | null;
  canalOrigem: string;
  canalOrigemOutro: string | null;
  proximoPasso: string;
  scoreTotal: number;
  scorePercentual: number;
  classificacao: string;
  recomendacao: string;
  flags: string[];
  status: string;
  responsavel: { id: string; nome: string } | null;
  observacoesInternas: string | null;
  consentimentoContato: boolean;
  consentimentoPrivacidade: boolean;
  origemUtm: Record<string, string> | null;
  criadoEm: string;
  statusHistory: {
    id: string;
    statusAnterior: string | null;
    statusNovo: string;
    observacao: string | null;
    usuario: string | null;
    criadoEm: string;
  }[];
};

const answerField: Record<string, keyof LeadPlain> = {
  procedimento_interesse: "procedimentoInteresse",
  canal_origem: "canalOrigem",
  proximo_passo: "proximoPasso",
};

export default function LeadDetail({
  lead,
  detalhe,
  scoreMaximo,
  users,
  papel,
}: {
  lead: LeadPlain;
  detalhe: Detalhe;
  scoreMaximo: number;
  users: { id: string; nome: string }[];
  papel: string;
}) {
  const router = useRouter();
  const canEdit = papel !== "visualizador";

  const [status, setStatus] = useState(lead.status);
  const [statusObs, setStatusObs] = useState("");
  const [responsavel, setResponsavel] = useState(lead.responsavel?.id ?? "");
  const [obs, setObs] = useState(lead.observacoesInternas ?? "");
  const [saving, setSaving] = useState<string | null>(null);

  async function saveStatus() {
    setSaving("status");
    await fetch(`/api/admin/leads/${lead.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, observacao: statusObs || undefined }),
    });
    setStatusObs("");
    setSaving(null);
    router.refresh();
  }

  async function saveResponsavel(value: string) {
    setResponsavel(value);
    setSaving("resp");
    await fetch(`/api/admin/leads/${lead.id}/responsavel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responsavelId: value || null }),
    });
    setSaving(null);
    router.refresh();
  }

  async function saveObs() {
    setSaving("obs");
    await fetch(`/api/admin/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observacoes: obs }),
    });
    setSaving(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Link href="/admin/leads" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
        ← Voltar para leads
      </Link>

      {/* Cabeçalho */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-ink-900">{lead.nome}</h1>
              <span className={`badge ${CLASSIFICACAO_BADGE[lead.classificacao]}`}>
                {CLASSIFICACAO_LABEL[lead.classificacao]}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-500">
              {lead.whatsapp}
              {lead.email ? ` · ${lead.email}` : ""}
              {lead.cidadeEstado ? ` · ${lead.cidadeEstado}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-ink-400">
              Entrada em {new Date(lead.criadoEm).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold text-ink-900">{lead.scorePercentual}%</p>
            <p className="text-xs text-ink-400">
              {lead.scoreTotal} de {scoreMaximo} pontos
            </p>
          </div>
        </div>
        {lead.flags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {lead.flags.map((f) => (
              <span key={f} className="badge bg-amber-50 text-amber-700 ring-amber-100">
                {FLAG_LABEL[f] ?? f}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-5 lg:col-span-2">
          {/* Recomendação */}
          <div className="card p-6">
            <h2 className="mb-2 text-sm font-semibold text-ink-800">Recomendação operacional</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">{lead.recomendacao}</p>
          </div>

          {/* Score detalhado */}
          <div className="card p-6">
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Score detalhado por pergunta</h2>
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-ink-400">
                <tr>
                  <th className="pb-2 font-medium">Pergunta</th>
                  <th className="pb-2 text-center font-medium">Valor</th>
                  <th className="pb-2 text-center font-medium">Peso</th>
                  <th className="pb-2 text-right font-medium">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {detalhe.map((d) => (
                  <tr key={d.campo}>
                    <td className="py-2 pr-3 text-ink-700">{d.titulo}</td>
                    <td className="py-2 text-center text-ink-500">{d.valor}</td>
                    <td className="py-2 text-center text-ink-500">{d.peso}</td>
                    <td className="py-2 text-right font-medium text-ink-900">{d.pontuacao}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink-100">
                  <td className="py-2 font-semibold text-ink-900" colSpan={3}>Total</td>
                  <td className="py-2 text-right font-semibold text-ink-900">
                    {lead.scoreTotal} / {scoreMaximo}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Respostas completas */}
          <div className="card p-6">
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Respostas completas</h2>
            <dl className="divide-y divide-ink-50">
              {QUESTIONS.map((q) => {
                const field = answerField[q.campo];
                const code = field
                  ? (lead[field] as string)
                  : (lead[camelize(q.campo) as keyof LeadPlain] as string);
                let label = getOptionLabel(q.campo, code);
                if (q.campo === "procedimento_interesse" && lead.procedimentoOutro)
                  label += ` — ${lead.procedimentoOutro}`;
                if (q.campo === "dificuldade_decisao" && lead.dificuldadeOutro)
                  label += ` — ${lead.dificuldadeOutro}`;
                if (q.campo === "canal_origem" && lead.canalOrigemOutro)
                  label += ` — ${lead.canalOrigemOutro}`;
                return (
                  <div key={q.campo} className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-3">
                    <dt className="text-xs text-ink-400 sm:col-span-1">
                      {q.numero}. {q.titulo}
                    </dt>
                    <dd className="text-sm text-ink-700 sm:col-span-2">{label}</dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-3 text-xs text-ink-400">
              Consentimentos: contato {lead.consentimentoContato ? "✓" : "✗"} · privacidade{" "}
              {lead.consentimentoPrivacidade ? "✓" : "✗"}
              {lead.origemUtm ? ` · UTM: ${Object.entries(lead.origemUtm).map(([k, v]) => `${k}=${v}`).join(", ")}` : ""}
            </p>
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-5">
          {/* Status */}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Status do atendimento</h2>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={!canEdit}
            >
              {STATUSES.map((s) => (
                <option key={s.code} value={s.code}>{s.label}</option>
              ))}
            </select>
            {canEdit && (
              <>
                <input
                  className="input mt-2"
                  placeholder="Observação da mudança (opcional)"
                  value={statusObs}
                  onChange={(e) => setStatusObs(e.target.value)}
                />
                <button
                  onClick={saveStatus}
                  disabled={saving === "status" || status === lead.status}
                  className="btn-primary mt-3 w-full"
                >
                  {saving === "status" ? "Salvando..." : "Atualizar status"}
                </button>
              </>
            )}
          </div>

          {/* Responsável */}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Responsável</h2>
            <select
              className="input"
              value={responsavel}
              onChange={(e) => saveResponsavel(e.target.value)}
              disabled={!canEdit}
            >
              <option value="">— Não atribuído —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          {/* Observações internas */}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Observações internas</h2>
            <textarea
              className="input min-h-24"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              disabled={!canEdit}
              placeholder="Anotações da equipe..."
            />
            {canEdit && (
              <button onClick={saveObs} disabled={saving === "obs"} className="btn-ghost mt-2 w-full">
                {saving === "obs" ? "Salvando..." : "Salvar observações"}
              </button>
            )}
          </div>

          {/* Histórico */}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Histórico de status</h2>
            {lead.statusHistory.length === 0 ? (
              <p className="text-sm text-ink-400">Sem alterações registradas.</p>
            ) : (
              <ul className="space-y-3">
                {lead.statusHistory.map((h) => (
                  <li key={h.id} className="text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-ink-400">{STATUS_LABEL[h.statusAnterior ?? ""] ?? h.statusAnterior ?? "—"}</span>
                      <span className="text-ink-300">→</span>
                      <span className="font-medium text-ink-800">{STATUS_LABEL[h.statusNovo] ?? h.statusNovo}</span>
                    </div>
                    <p className="text-xs text-ink-400">
                      {new Date(h.criadoEm).toLocaleString("pt-BR")}
                      {h.usuario ? ` · ${h.usuario}` : ""}
                    </p>
                    {h.observacao && <p className="mt-0.5 text-xs text-ink-500">{h.observacao}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function camelize(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
