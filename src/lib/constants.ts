// Status operacionais e rótulos de flags/classificação (matriz v1.0).

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
  registro_incompleto: "Registro incompleto",
  nao_acionar_comercialmente: "Não acionar comercialmente",
  lead_educacional: "Lead educacional",
  baixa_disponibilidade: "Baixa disponibilidade",
  necessita_abordagem_educativa: "Abordagem educativa",
  avaliar_fluxo_reparador: "Fluxo reparador",
};

export const CLASSIFICACAO_LABEL: Record<string, string> = {
  A: "Lead A — Alta prioridade",
  B: "Lead B — Prioridade intermediária",
  C: "Lead C — Baixa prioridade",
  D: "Lead D — Informativo/não priorizado",
  incompleto: "Lead incompleto — sem classe A–D",
};

/** Rótulo curto para badges de tabela. */
export const CLASSIFICACAO_CURTA: Record<string, string> = {
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  incompleto: "Incompleto",
};

// Cores por classificação (Tailwind classes) para badges.
export const CLASSIFICACAO_BADGE: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  B: "bg-sky-100 text-sky-800 ring-sky-200",
  C: "bg-amber-100 text-amber-800 ring-amber-200",
  D: "bg-slate-100 text-slate-700 ring-slate-200",
  incompleto: "bg-rose-50 text-rose-700 ring-rose-200",
};

/** Rótulos amigáveis dos campos obrigatórios (usados na lista de faltantes). */
export const CAMPO_LABEL: Record<string, string> = {
  nome: "Nome",
  whatsapp: "WhatsApp",
  consentimento_contato: "Consentimento de contato",
  consentimento_privacidade: "Ciência de privacidade",
  procedimento_interesse: "Q1 Procedimento",
  clareza_demanda: "Q2 Clareza da demanda",
  momento_atual: "Q3 Momento atual",
  tempo_consulta: "Q4 Tempo para consulta",
  tempo_cirurgia: "Q5 Tempo para cirurgia",
  disponibilidade_presencial: "Q6 Disponibilidade presencial",
  contato_anterior: "Q7 Contato anterior",
  dificuldade_decisao: "Q8 Principal dificuldade",
  canal_origem: "Q9 Canal de origem",
  proximo_passo: "Q10 Próximo passo",
};
