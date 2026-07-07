// Motor de cálculo do score, classificação, travas de exceção e recomendação.
// Referência: seções 6 (cálculo), 7 (classificação), 8 (exceções) e 9 (recomendações).

import { QUESTIONS, SCORED_QUESTIONS, SCORE_MAXIMO } from "./form-schema";

export type Classificacao = "A" | "B" | "C" | "D";

export type ScoringRuleInput = {
  campo: string;
  resposta: string;
  valor: number;
  peso: number;
  ativo?: boolean;
};

/** Respostas do formulário: campo -> código da opção selecionada */
export type Answers = Record<string, string>;

export type ScoringResult = {
  scoreTotal: number;
  scoreMaximo: number;
  scorePercentual: number;
  classificacao: Classificacao;
  flags: string[];
  recomendacao: string;
  /** detalhamento por pergunta (para tela de detalhe) */
  detalhe: Array<{
    campo: string;
    titulo: string;
    resposta: string;
    valor: number;
    peso: number;
    pontuacao: number;
  }>;
};

const NOMES_CLASSIFICACAO: Record<Classificacao, string> = {
  A: "Alta prioridade / lead quente",
  B: "Prioridade intermediária / lead morno",
  C: "Baixa prioridade / lead frio",
  D: "Informativo / não priorizar contato ativo",
};

export function nomeClassificacao(c: Classificacao): string {
  return NOMES_CLASSIFICACAO[c];
}

export function classificar(percentual: number): Classificacao {
  if (percentual >= 75) return "A";
  if (percentual >= 50) return "B";
  if (percentual >= 25) return "C";
  return "D";
}

// Constrói lookups a partir das regras do banco, com fallback para a config.
function buildLookups(rules?: ScoringRuleInput[]) {
  const pesoPorCampo = new Map<string, number>();
  const valorPorResposta = new Map<string, number>(); // chave: `${campo}::${resposta}`

  // Base: config (fonte da verdade)
  for (const q of SCORED_QUESTIONS) {
    pesoPorCampo.set(q.campo, q.peso);
    for (const opt of q.options) {
      valorPorResposta.set(`${q.campo}::${opt.code}`, opt.valor ?? 0);
    }
  }

  // Sobrescreve com regras ativas do banco (permite editar pesos sem código)
  if (rules) {
    for (const r of rules) {
      if (r.ativo === false) continue;
      pesoPorCampo.set(r.campo, r.peso);
      valorPorResposta.set(`${r.campo}::${r.resposta}`, r.valor);
    }
  }

  return { pesoPorCampo, valorPorResposta };
}

function gerarRecomendacao(classificacao: Classificacao, flags: string[]): string {
  let base: string;
  switch (classificacao) {
    case "A":
      base =
        "Lead com alta prontidão para consulta. Priorizar contato da equipe, oferecer horários disponíveis e conduzir para agendamento, mantendo linguagem informativa e sem prometer indicação cirúrgica ou orçamento definitivo.";
      break;
    case "B":
      base =
        "Lead com interesse relevante, mas ainda com dúvidas ou necessidade de qualificação complementar. Entrar em contato pelo WhatsApp, esclarecer principais dúvidas e avaliar possibilidade de agendamento.";
      break;
    case "C":
      base =
        "Lead em fase inicial de decisão. Recomenda-se envio de informações gerais, conteúdo educativo e follow-up não prioritário.";
      break;
    case "D":
    default:
      base =
        "Lead sem prontidão atual para consulta. Não priorizar atendimento humano imediato. Caso tenha autorizado contato, pode receber informação geral ou fluxo educativo.";
      break;
  }

  const complementos: string[] = [];
  if (flags.includes("nao_acionar_comercialmente")) {
    complementos.push(
      "ATENÇÃO: lead declarou que NÃO quer ser contatado. Não realizar contato ativo nem enviar para fila de WhatsApp; apenas armazenamento interno."
    );
  }
  if (flags.includes("lead_informativo")) {
    complementos.push("Perfil informativo/educacional: nutrição com conteúdo, sem abordagem comercial ativa.");
  }
  if (flags.includes("necessita_abordagem_educativa")) {
    complementos.push("Lead com medo/insegurança: usar abordagem acolhedora, informativa e não agressiva.");
  }
  if (flags.includes("baixa_disponibilidade")) {
    complementos.push("Baixa disponibilidade declarada: alinhar expectativa de agenda com a equipe.");
  }
  if (flags.includes("avaliar_fluxo_reparador")) {
    complementos.push("Procedimento reparador: direcionar para avaliação adequada pela equipe.");
  }

  return complementos.length ? `${base}\n\n${complementos.join(" ")}` : base;
}

export function computeScore(answers: Answers, rules?: ScoringRuleInput[]): ScoringResult {
  const { pesoPorCampo, valorPorResposta } = buildLookups(rules);

  let scoreTotal = 0;
  const detalhe: ScoringResult["detalhe"] = [];

  for (const q of QUESTIONS) {
    const resposta = answers[q.campo];
    if (!q.pontua) continue;

    const peso = pesoPorCampo.get(q.campo) ?? q.peso;
    const valor = valorPorResposta.get(`${q.campo}::${resposta}`) ?? 0;
    const pontuacao = peso * valor;
    scoreTotal += pontuacao;

    detalhe.push({
      campo: q.campo,
      titulo: q.titulo,
      resposta,
      valor,
      peso,
      pontuacao,
    });
  }

  const scoreMaximo = SCORE_MAXIMO;
  const scorePercentual = scoreMaximo > 0 ? (scoreTotal / scoreMaximo) * 100 : 0;

  let classificacao = classificar(scorePercentual);
  const flags: string[] = [];

  // ---- Regras de exceção (seção 8) ----

  // 8.1 Lead não quer ser contatado -> força Lead D (sobrescreve o score)
  if (answers.proximo_passo === "nao_contatar") {
    classificacao = "D";
    flags.push("nao_acionar_comercialmente");
  }

  // 8.2 Lead apenas pesquisando e próximo passo não indica contato ativo
  const proximoPassoAtivo = ["agendar", "whatsapp", "disponibilidade_agenda", "valores_consulta"].includes(
    answers.proximo_passo
  );
  if (answers.momento_atual === "pesquisando" && !proximoPassoAtivo) {
    flags.push("lead_informativo");
  }

  // 8.3 Baixa disponibilidade (flag, sem rebaixar score automaticamente)
  if (answers.disponibilidade_presencial === "sem_disponibilidade") {
    flags.push("baixa_disponibilidade");
  }

  // 8.4 Insegurança ou medo
  if (answers.dificuldade_decisao === "medo_inseguranca") {
    flags.push("necessita_abordagem_educativa");
  }

  // 8.5 Procedimento reparador (flag, sem reduzir score)
  if (answers.procedimento_interesse === "reparador") {
    flags.push("avaliar_fluxo_reparador");
  }

  const recomendacao = gerarRecomendacao(classificacao, flags);

  return {
    scoreTotal,
    scoreMaximo,
    scorePercentual: Math.round(scorePercentual * 10) / 10,
    classificacao,
    flags,
    recomendacao,
    detalhe,
  };
}
