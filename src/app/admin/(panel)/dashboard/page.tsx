"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { getOptionLabel } from "@/lib/form-schema";
import { CLASSIFICACAO_LABEL, STATUS_LABEL } from "@/lib/constants";

type Dashboard = {
  total: number;
  mediaScore: number;
  porClassificacao: { classificacao: string; total: number }[];
  porProcedimento: { code: string; total: number }[];
  porCanal: { code: string; total: number }[];
  porDificuldade: { code: string; total: number }[];
  porStatus: { code: string; total: number }[];
  taxas: { querAgendar: number; apenasInfo: number; semContato: number };
};

const CLASS_COLORS: Record<string, string> = { A: "#059669", B: "#0284c7", C: "#d97706", D: "#64748b" };

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-ink-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-ink-500">Carregando...</p>;
  if (!data) return <p className="text-ink-500">Não foi possível carregar o dashboard.</p>;

  const classData = ["A", "B", "C", "D"].map((c) => ({
    name: c,
    total: data.porClassificacao.find((x) => x.classificacao === c)?.total ?? 0,
  }));

  const procData = data.porProcedimento
    .map((p) => ({ name: getOptionLabel("procedimento_interesse", p.code), total: p.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const canalData = data.porCanal
    .map((p) => ({ name: getOptionLabel("canal_origem", p.code), total: p.total }))
    .sort((a, b) => b.total - a.total);

  const dificuldadeData = data.porDificuldade
    .map((p) => ({ name: getOptionLabel("dificuldade_decisao", p.code), total: p.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Dashboard</h1>
        <p className="text-sm text-ink-500">Indicadores operacionais da equipe.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Total de leads" value={data.total} />
        <Kpi label="Média de score" value={`${data.mediaScore}%`} />
        <Kpi label="Querem agendar" value={`${data.taxas.querAgendar}%`} sub="próximo passo = agendar" />
        <Kpi label="Sem desejo de contato" value={`${data.taxas.semContato}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-800">Leads por classificação</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#61708c" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#61708c" }} />
                <Tooltip
                  formatter={(v) => [`${v} leads`, ""]}
                  labelFormatter={(l) => CLASSIFICACAO_LABEL[l as string] ?? l}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {classData.map((d) => (
                    <Cell key={d.name} fill={CLASS_COLORS[d.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-800">Origem dos leads (canais)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={canalData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#61708c" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11, fill: "#61708c" }}
                />
                <Tooltip formatter={(v) => [`${v} leads`, ""]} />
                <Bar dataKey="total" fill="#348783" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-800">Distribuição por procedimento</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={procData} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#61708c" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 11, fill: "#61708c" }}
                />
                <Tooltip formatter={(v) => [`${v} leads`, ""]} />
                <Bar dataKey="total" fill="#4fa39e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-800">Principais barreiras de decisão</h2>
          <ul className="space-y-2">
            {dificuldadeData.map((d) => (
              <li key={d.name} className="flex items-center justify-between text-sm">
                <span className="text-ink-600">{d.name}</span>
                <span className="font-semibold text-ink-900">{d.total}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink-800">Leads por status</h2>
        <div className="flex flex-wrap gap-2">
          {data.porStatus.map((s) => (
            <span key={s.code} className="badge bg-ink-100 text-ink-700 ring-ink-200">
              {STATUS_LABEL[s.code] ?? s.code}: {s.total}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
