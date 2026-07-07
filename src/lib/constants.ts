// Status operacionais (seção 12.3) e rótulos de flags/classificação.

export const STATUSES: { code: string; label: string }[] = [
  { code: "novo", label: "Novo" },
  { code: "contato_realizado", label: "Contato realizado" },
  { code: "aguardando_resposta", label: "Aguardando resposta" },
  { code: "consulta_agendada", label: "Consulta agendada" },
  { code: "compareceu", label: "Compareceu à consulta" },
  { code: "nao_compareceu", label: "Não compareceu" },
  { code: "perdeu_interesse", label: "Perdeu interesse" },
  { code: "nao_deseja_contato", label: "Não deseja contato" },
  { code: "encerrado", label: "Encerrado" },
  { code: "duplicado", label: "Duplicado" },
];

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUSES.map((s) => [s.code, s.label])
);

export const FLAG_LABEL: Record<string, string> = {
  nao_acionar_comercialmente: "Não acionar comercialmente",
  lead_informativo: "Perfil informativo",
  baixa_disponibilidade: "Baixa disponibilidade",
  necessita_abordagem_educativa: "Abordagem educativa",
  avaliar_fluxo_reparador: "Fluxo reparador",
};

export const CLASSIFICACAO_LABEL: Record<string, string> = {
  A: "Lead A — Alta prioridade",
  B: "Lead B — Prioridade intermediária",
  C: "Lead C — Baixa prioridade",
  D: "Lead D — Informativo",
};

// Cores por classificação (Tailwind classes) para badges.
export const CLASSIFICACAO_BADGE: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  B: "bg-sky-100 text-sky-800 ring-sky-200",
  C: "bg-amber-100 text-amber-800 ring-amber-200",
  D: "bg-slate-100 text-slate-700 ring-slate-200",
};
