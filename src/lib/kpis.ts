// KPIs operacionais do funil de atendimento (seção 12 do documento técnico-funcional v2).
// Ficam FORA do escore: nenhum valor daqui altera score ou classe de um lead.
// Função pura (sem banco) para poder ser testada isoladamente.

/** Status que indicam que a equipe já fez o primeiro contato com o lead. */
export const STATUS_CONTATO = [
  "contato_realizado",
  "aguardando_resposta",
  "consulta_agendada",
  "compareceu",
  "nao_compareceu",
] as const;

/** Status que indicam que houve consulta agendada (inclui os desfechos da consulta). */
export const STATUS_AGENDADO = ["consulta_agendada", "compareceu", "nao_compareceu"] as const;

export type LeadFunil = {
  criadoEm: Date;
  status: string;
  classificacao: string;
  historico: { statusNovo: string; criadoEm: Date }[];
};

export type Funil = {
  /** leads considerados (exclui "Lead incompleto", que não tem classe A–D) */
  base: number;
  contatados: number;
  /** mediana, em horas, entre a entrada do lead e o primeiro contato registrado; null sem dados */
  medianaHorasPrimeiroContato: number | null;
  agendados: number;
  compareceram: number;
  /** % da base com consulta agendada */
  taxaAgendamento: number;
  /** % dos agendados que compareceram */
  taxaComparecimento: number;
  /** % da base que chegou à consulta realizada (lead → consulta) */
  taxaConversao: number;
};

function alcancou(l: LeadFunil, alvo: readonly string[]): boolean {
  return alvo.includes(l.status) || l.historico.some((h) => alvo.includes(h.statusNovo));
}

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const v = valores.slice().sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

export function calcularFunil(leads: LeadFunil[]): Funil {
  const base = leads.filter((l) => l.classificacao !== "incompleto");

  const horas: number[] = [];
  let contatados = 0;
  for (const l of base) {
    const primeiro = l.historico
      .filter((h) => (STATUS_CONTATO as readonly string[]).includes(h.statusNovo))
      .sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime())[0];
    if (primeiro) {
      contatados++;
      horas.push(Math.max(0, (primeiro.criadoEm.getTime() - l.criadoEm.getTime()) / 3_600_000));
    } else if ((STATUS_CONTATO as readonly string[]).includes(l.status)) {
      // status de contato sem histórico (ex.: dado legado): conta como contatado, sem tempo
      contatados++;
    }
  }

  const agendados = base.filter((l) => alcancou(l, STATUS_AGENDADO)).length;
  const compareceram = base.filter((l) => alcancou(l, ["compareceu"])).length;
  const med = mediana(horas);

  return {
    base: base.length,
    contatados,
    medianaHorasPrimeiroContato: med === null ? null : Math.round(med * 1000) / 1000,
    agendados,
    compareceram,
    taxaAgendamento: pct(agendados, base.length),
    taxaComparecimento: pct(compareceram, agendados),
    taxaConversao: pct(compareceram, base.length),
  };
}

/** Formata horas como "25 min", "3,5 h" ou "2,1 dias" para exibição. */
export function formatarDuracao(horas: number | null): string {
  if (horas === null) return "—";
  if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 48) return `${horas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  return `${(horas / 24).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
}
