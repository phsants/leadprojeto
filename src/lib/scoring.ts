// Motor de cálculo do score, classificação, travas de exceção e recomendação.
// Referência: Documento técnico-funcional v2 — Matriz de classificação v1.0
// (congelada em 12/09/2026): seções 5 (cálculo), 6 (faixas), 7 (ordem de
// processamento), 8 (exceções) e 9 (rastreabilidade).

import { QUESTIONS, SCORED_QUESTIONS, SCORE_MAXIMO } from "./form-schema";

/** Versão da matriz de pontuação em vigor. Qualquer alteração de peso/valor/faixa exige nova versão. */
export const MATRIX_VERSION = "1.0";

/** Classes A–D; "incompleto" = registro sem campo obrigatório (sem classe A–D). */
export type Classificacao = "A" | "B" | "C" | "D" | "incompleto";
export type ClasseAD = Exclude<Classificacao, "incompleto">;

/** Respostas do formulário: campo -> código da opção selecionada */
export type Answers = Record<string, string>;

/**
 * Faixas operacionais por escore ABSOLUTO (seção 6). A classe é decidida pelo
 * total inteiro, nunca pelo percentual, para impedir divergência por arredondamento.
 */
export const FAIXAS: { classe: ClasseAD; min: number; max: number; nome: string }[] = [
  { classe: "A", min: 41, max: 54, nome: "Alta prioridade" },
  { classe: "B", min: 27, max: 40, nome: "Prioridade intermediária" },
  { classe: "C", min: 14, max: 26, nome: "Baixa prioridade" },
  { classe: "D", min: 0, max: 13, nome: "Informativo/não priorizado" },
];

const NOMES_CLASSIFICACAO: Record<Classificacao, string> = {
  A: "Alta prioridade",
  B: "Prioridade intermediária",
  C: "Baixa prioridade",
  D: "Informativo/não priorizado",
  incompleto: "Lead incompleto (sem classe A–D)",
};

export function nomeClassificacao(c: Classificacao): string {
  return NOMES_CLASSIFICACAO[c];
}

/** Classifica pelo escore absoluto (0–54). */
export function classificar(scoreTotal: number): ClasseAD {
  const total = Math.max(0, Math.min(SCORE_MAXIMO, Math.trunc(scoreTotal)));
  for (const f of FAIXAS) if (total >= f.min) return f.classe;
  return "D";
}

// ---------------------------------------------------------------------------
// Completude (seção 7, passos 1 e 2)
// ---------------------------------------------------------------------------

export type CadastroInput = {
  nome?: string | null;
  whatsapp?: string | null;
  consentimentoContato?: boolean | null;
  consentimentoPrivacidade?: boolean | null;
  answers: Answers;
};

/**
 * Lista os campos obrigatórios ausentes ou inválidos. Vazio = registro completo.
 * Obrigatórios: nome, whatsapp, os dois consentimentos e as 10 perguntas
 * (a resposta precisa ser um código válido da pergunta).
 */
export function camposFaltantes(input: CadastroInput): string[] {
  const faltam: string[] = [];
  if (!input.nome || !input.nome.trim()) faltam.push("nome");
  if (!input.whatsapp || !input.whatsapp.trim()) faltam.push("whatsapp");
  if (input.consentimentoContato !== true) faltam.push("consentimento_contato");
  if (input.consentimentoPrivacidade !== true) faltam.push("consentimento_privacidade");
  for (const q of QUESTIONS) {
    const code = input.answers[q.campo];
    if (!code || !q.options.some((o) => o.code === code)) faltam.push(q.campo);
  }
  return faltam;
}

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

export type ScoringResult = {
  matrixVersion: string;
  scoreTotal: number;
  scoreMaximo: number;
  /** percentual com 1 casa decimal — só para exibição; nunca decide a classe */
  scorePercentual: number;
  /** classe calculada só pelo escore absoluto (passo 4) */
  classificacaoPorScore: Classificacao;
  /** classe após as regras de sobrescrita (passo 5) */
  classificacaoFinal: Classificacao;
  /** motivo da sobrescrita, quando classificacaoFinal difere da classe por score */
  overrideReason: string | null;
  /** campos obrigatórios ausentes (vazio quando o registro está completo) */
  camposFaltantes: string[];
  flags: string[];
  recomendacao: string;
  /** detalhamento por pergunta pontuada (valor, peso e subtotal) */
  detalhe: Array<{
    campo: string;
    titulo: string;
    resposta: string;
    valor: number;
    peso: number;
    pontuacao: number;
  }>;
};

export const FLAGS = {
  registroIncompleto: "registro_incompleto",
  naoAcionar: "nao_acionar_comercialmente",
  educacional: "lead_educacional",
  baixaDisponibilidade: "baixa_disponibilidade",
  abordagemEducativa: "necessita_abordagem_educativa",
  fluxoReparador: "avaliar_fluxo_reparador",
} as const;

export const OVERRIDE_NAO_CONTATO =
  "Próximo passo = não quer ser contatado: classe final sobrescrita para Lead D (regra de exceção 3). Score calculado preservado para auditoria.";

function gerarRecomendacao(classificacao: Classificacao, flags: string[]): string {
  let base: string;
  switch (classificacao) {
    case "A":
      base =
        "Lead A — alta prioridade. Priorizar contato da equipe e oferecer horários disponíveis, mantendo linguagem informativa e sem promessa clínica ou financeira.";
      break;
    case "B":
      base =
        "Lead B — prioridade intermediária. Entrar em contato, esclarecer as principais dúvidas e avaliar possibilidade de agendamento.";
      break;
    case "C":
      base =
        "Lead C — baixa prioridade. Fluxo educativo (informações gerais e conteúdo) com acompanhamento não prioritário.";
      break;
    case "incompleto":
      base =
        "Lead incompleto — registro com campo obrigatório ou consentimento ausente. Sem classe A–D: solicitar complementação dos dados antes de qualquer priorização.";
      break;
    case "D":
    default:
      base =
        "Lead D — informativo/não priorizado. Não demandar atendimento humano imediato; conteúdo geral apenas se o contato tiver sido autorizado.";
      break;
  }

  const complementos: string[] = [];
  if (flags.includes(FLAGS.naoAcionar)) {
    complementos.push(
      "ATENÇÃO: lead declarou que NÃO quer ser contatado. Não inserir em fila ativa nem realizar contato comercial; respeitar o consentimento. Apenas armazenamento interno."
    );
  }
  if (flags.includes(FLAGS.educacional)) {
    complementos.push(
      "Lead educacional (apenas pesquisando, sem pedido de contato): fluxo educacional, sem abordagem comercial ativa."
    );
  }
  if (flags.includes(FLAGS.abordagemEducativa)) {
    complementos.push("Medo/insegurança declarados: contato acolhedor e informativo, sem pressão.");
  }
  if (flags.includes(FLAGS.baixaDisponibilidade)) {
    complementos.push(
      "Sem disponibilidade presencial no momento (alerta operacional): alinhar expectativa de agenda com a equipe."
    );
  }
  if (flags.includes(FLAGS.fluxoReparador)) {
    complementos.push("Procedimento reparador: encaminhar ao fluxo apropriado de avaliação pela equipe.");
  }

  return complementos.length ? `${base}\n\n${complementos.join(" ")}` : base;
}

/**
 * Executa a ordem obrigatória de processamento (seção 7):
 *  3. oito subtotais, total e percentual;
 *  4. classe pelo total absoluto;
 *  5. regras de sobrescrita;
 *  6. flags;
 *  7. recomendação operacional.
 * Pesos e valores vêm exclusivamente de form-schema (matriz v1.0 bloqueada).
 *
 * `camposFaltantes` (passos 1–2) vem de quem chama: o formulário público já
 * rejeita submissão incompleta; a importação passa a lista para o registro
 * receber "Lead incompleto" em vez de uma classe A–D.
 */
export function computeScore(answers: Answers, opts: { camposFaltantes?: string[] } = {}): ScoringResult {
  const faltantes = opts.camposFaltantes ?? [];

  // ---- 3. Subtotais ----
  let scoreTotal = 0;
  const detalhe: ScoringResult["detalhe"] = [];
  for (const q of SCORED_QUESTIONS) {
    const resposta = answers[q.campo] ?? "";
    const valor = q.options.find((o) => o.code === resposta)?.valor ?? 0;
    const pontuacao = q.peso * valor;
    scoreTotal += pontuacao;
    detalhe.push({ campo: q.campo, titulo: q.titulo, resposta, valor, peso: q.peso, pontuacao });
  }
  const scoreMaximo = SCORE_MAXIMO;
  const scorePercentual = scoreMaximo > 0 ? (scoreTotal / scoreMaximo) * 100 : 0;

  const flags: string[] = [];

  // ---- 1–2. Registro incompleto: sem classe A–D, sem sobrescrita ----
  if (faltantes.length > 0) {
    flags.push(FLAGS.registroIncompleto);
    return {
      matrixVersion: MATRIX_VERSION,
      scoreTotal,
      scoreMaximo,
      scorePercentual: Math.round(scorePercentual * 10) / 10,
      classificacaoPorScore: "incompleto",
      classificacaoFinal: "incompleto",
      overrideReason: null,
      camposFaltantes: faltantes,
      flags,
      recomendacao: gerarRecomendacao("incompleto", flags),
      detalhe,
    };
  }

  // ---- 4. Classe pelo total absoluto ----
  const classificacaoPorScore = classificar(scoreTotal);

  // ---- 5. Sobrescritas ----
  let classificacaoFinal: Classificacao = classificacaoPorScore;
  let overrideReason: string | null = null;
  if (answers.proximo_passo === "nao_contatar") {
    classificacaoFinal = "D";
    overrideReason = OVERRIDE_NAO_CONTATO;
    flags.push(FLAGS.naoAcionar);
  }

  // ---- 6. Flags (não alteram o total nem a classe) ----
  const proximoPassoAtivo = ["agendar", "whatsapp", "disponibilidade_agenda", "valores_consulta"].includes(
    answers.proximo_passo
  );
  if (answers.momento_atual === "pesquisando" && !proximoPassoAtivo) flags.push(FLAGS.educacional);
  if (answers.disponibilidade_presencial === "sem_disponibilidade") flags.push(FLAGS.baixaDisponibilidade);
  if (answers.dificuldade_decisao === "medo_inseguranca") flags.push(FLAGS.abordagemEducativa);
  if (answers.procedimento_interesse === "reparador") flags.push(FLAGS.fluxoReparador);

  // ---- 7. Recomendação ----
  const recomendacao = gerarRecomendacao(classificacaoFinal, flags);

  return {
    matrixVersion: MATRIX_VERSION,
    scoreTotal,
    scoreMaximo,
    scorePercentual: Math.round(scorePercentual * 10) / 10,
    classificacaoPorScore,
    classificacaoFinal,
    overrideReason,
    camposFaltantes: [],
    flags,
    recomendacao,
    detalhe,
  };
}

/** Monta o mapa de respostas a partir de um registro do banco (colunas camelCase). */
export function answersFromLead(l: {
  procedimentoInteresse: string;
  clarezaDemanda: string;
  momentoAtual: string;
  tempoConsulta: string;
  tempoCirurgia: string;
  disponibilidadePresencial: string;
  contatoAnterior: string;
  dificuldadeDecisao: string;
  canalOrigem: string;
  proximoPasso: string;
}): Answers {
  return {
    procedimento_interesse: l.procedimentoInteresse,
    clareza_demanda: l.clarezaDemanda,
    momento_atual: l.momentoAtual,
    tempo_consulta: l.tempoConsulta,
    tempo_cirurgia: l.tempoCirurgia,
    disponibilidade_presencial: l.disponibilidadePresencial,
    contato_anterior: l.contatoAnterior,
    dificuldade_decisao: l.dificuldadeDecisao,
    canal_origem: l.canalOrigem,
    proximo_passo: l.proximoPasso,
  };
}
