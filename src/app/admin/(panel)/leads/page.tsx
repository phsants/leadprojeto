"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { QUESTIONS, getOptionLabel } from "@/lib/form-schema";
import { CLASSIFICACAO_BADGE, STATUS_LABEL, STATUSES, FLAG_LABEL } from "@/lib/constants";

type LeadRow = {
  id: string;
  criadoEm: string;
  nome: string;
  whatsapp: string;
  procedimentoInteresse: string;
  scorePercentual: number;
  classificacao: string;
  canalOrigem: string;
  proximoPasso: string;
  status: string;
  flags: string[];
  responsavel: { nome: string } | null;
  atualizadoEm: string;
};

const procedimentoOpts = QUESTIONS.find((q) => q.campo === "procedimento_interesse")!.options;
const canalOpts = QUESTIONS.find((q) => q.campo === "canal_origem")!.options;

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: "",
    classificacao: "",
    procedimento: "",
    canal: "",
    status: "",
    flag: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    fetch(`/api/admin/leads?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const set = (k: keyof typeof filters, v: string) => setFilters((f) => ({ ...f, [k]: v }));

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reimportar o mesmo arquivo
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/import", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) {
        setImportMsg({ ok: false, text: d.error || "Falha ao importar." });
      } else {
        let text = `${d.imported} cadastro(s) importado(s) de ${d.totalRows} linha(s).`;
        if (d.ignoredColumns?.length)
          text += ` Colunas não reconhecidas (ignoradas): ${d.ignoredColumns.join(", ")}.`;
        setImportMsg({ ok: true, text });
        load();
      }
    } catch {
      setImportMsg({ ok: false, text: "Erro de conexão ao importar." });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Leads</h1>
          <p className="text-sm text-ink-500">{leads.length} resultado(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onImportFile}
          />
          <button
            className="btn-primary"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 7.5 12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            {importing ? "Importando..." : "Importar CSV"}
          </button>
          <a href="/api/admin/import/template" className="btn-ghost text-xs">
            Baixar modelo
          </a>
          <a href="/api/admin/export" className="btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar CSV
          </a>
        </div>
      </div>

      {importMsg && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ring-1 ${
            importMsg.ok
              ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
              : "bg-rose-50 text-rose-700 ring-rose-100"
          }`}
        >
          {importMsg.text}
        </div>
      )}

      {/* Filtros */}
      <div className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <input
          className="input col-span-2 sm:col-span-3 lg:col-span-2"
          placeholder="Buscar nome, WhatsApp ou e-mail"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
        />
        <select className="input" value={filters.classificacao} onChange={(e) => set("classificacao", e.target.value)}>
          <option value="">Classificação</option>
          <option value="A">Lead A</option>
          <option value="B">Lead B</option>
          <option value="C">Lead C</option>
          <option value="D">Lead D</option>
        </select>
        <select className="input" value={filters.procedimento} onChange={(e) => set("procedimento", e.target.value)}>
          <option value="">Procedimento</option>
          {procedimentoOpts.map((o) => (
            <option key={o.code} value={o.code}>{o.label}</option>
          ))}
        </select>
        <select className="input" value={filters.canal} onChange={(e) => set("canal", e.target.value)}>
          <option value="">Canal</option>
          {canalOpts.map((o) => (
            <option key={o.code} value={o.code}>{o.label}</option>
          ))}
        </select>
        <select className="input" value={filters.status} onChange={(e) => set("status", e.target.value)}>
          <option value="">Status</option>
          {STATUSES.map((s) => (
            <option key={s.code} value={s.code}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100 text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Procedimento</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Classe</th>
                <th className="px-4 py-3 font-medium">Canal</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Resp.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-400">Carregando...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-400">Nenhum lead encontrado.</td></tr>
              ) : (
                leads.map((l) => (
                  <tr key={l.id} className="group hover:bg-brand-50/40">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-500">
                      {new Date(l.criadoEm).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads/${l.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                        {l.nome}
                      </Link>
                      <div className="text-xs text-ink-400">{l.whatsapp}</div>
                      {l.flags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {l.flags.map((f) => (
                            <span key={f} className="badge bg-amber-50 text-amber-700 ring-amber-100">
                              {FLAG_LABEL[f] ?? f}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {getOptionLabel("procedimento_interesse", l.procedimentoInteresse)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink-800">{l.scorePercentual}%</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${CLASSIFICACAO_BADGE[l.classificacao]}`}>{l.classificacao}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{getOptionLabel("canal_origem", l.canalOrigem)}</td>
                    <td className="px-4 py-3 text-ink-600">{STATUS_LABEL[l.status] ?? l.status}</td>
                    <td className="px-4 py-3 text-ink-500">{l.responsavel?.nome ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
