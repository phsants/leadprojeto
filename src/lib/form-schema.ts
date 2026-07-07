// Fonte única da verdade do formulário: perguntas, opções (com códigos estáveis),
// pesos e valores. Usada pelo formulário público, pelo cálculo de score e pelo seed.
// Referência: seções 4, 5, 6 e 8 do documento técnico-funcional.

export type Option = {
  code: string;
  label: string;
  /** valor da resposta para perguntas pontuadas */
  valor?: number;
};

export type Question = {
  /** nome do campo no banco (ex.: clareza_demanda) */
  campo: string;
  numero: number;
  titulo: string;
  descricao?: string;
  /** se true, entra no score */
  pontua: boolean;
  peso: number;
  options: Option[];
  /** código da opção que abre um campo de texto livre ("Outro") */
  outroCode?: string;
  /** nome do campo de texto livre associado */
  outroCampo?: string;
};

// ---- Campos cadastrais (não entram no score) ----
export const CAMPOS_CADASTRAIS = {
  nome: { label: "Nome completo", obrigatorio: true },
  whatsapp: { label: "WhatsApp", obrigatorio: true },
  email: { label: "E-mail (opcional)", obrigatorio: false },
  cidade_estado: { label: "Cidade / Estado (opcional)", obrigatorio: false },
} as const;

// ---- Perguntas ----
export const QUESTIONS: Question[] = [
  {
    campo: "procedimento_interesse",
    numero: 1,
    titulo: "Procedimento ou região de interesse",
    descricao: "Isso nos ajuda a direcionar o atendimento.",
    pontua: false,
    peso: 0,
    outroCode: "outro",
    outroCampo: "procedimento_outro",
    options: [
      { code: "mama", label: "Mama" },
      { code: "abdome", label: "Abdome ou contorno corporal" },
      { code: "lipo", label: "Lipoaspiração / lipoescultura" },
      { code: "face", label: "Face / rejuvenescimento facial" },
      { code: "nariz", label: "Nariz / rinoplastia" },
      { code: "palpebras", label: "Pálpebras" },
      { code: "pos_bariatrica", label: "Pós-bariátrica / excesso de pele" },
      { code: "gluteos", label: "Glúteos" },
      { code: "intima", label: "Cirurgia íntima" },
      { code: "reparador", label: "Procedimento reparador" },
      { code: "nao_sei", label: "Ainda não sei exatamente" },
      { code: "outro", label: "Outro" },
    ],
  },
  {
    campo: "clareza_demanda",
    numero: 2,
    titulo: "Clareza da demanda",
    descricao: "O quanto você já sabe sobre o que quer avaliar?",
    pontua: true,
    peso: 2,
    options: [
      { code: "ja_sei", label: "Sim, já sei o procedimento que quero avaliar", valor: 3 },
      { code: "queixa_definida", label: "Tenho uma queixa ou região definida, mas ainda não sei o procedimento ideal", valor: 2 },
      { code: "ideia_geral", label: "Tenho uma ideia geral, mas preciso entender melhor as opções", valor: 1 },
      { code: "pesquisando", label: "Ainda estou apenas pesquisando", valor: 0 },
    ],
  },
  {
    campo: "momento_atual",
    numero: 3,
    titulo: "Momento atual",
    descricao: "O que melhor descreve o seu momento?",
    pontua: true,
    peso: 3,
    options: [
      { code: "agendar", label: "Quero agendar uma consulta", valor: 3 },
      { code: "entender_passos", label: "Quero falar com a equipe para entender os próximos passos", valor: 2 },
      { code: "valores_agenda", label: "Quero saber mais sobre valores, agenda e funcionamento", valor: 2 },
      { code: "comparando", label: "Estou comparando opções/profissionais", valor: 1 },
      { code: "pesquisando", label: "Estou apenas pesquisando, sem intenção de agendar agora", valor: 0 },
    ],
  },
  {
    campo: "tempo_consulta",
    numero: 4,
    titulo: "Tempo desejado para marcar consulta",
    pontua: true,
    peso: 3,
    options: [
      { code: "quanto_antes", label: "O quanto antes", valor: 3 },
      { code: "7_dias", label: "Nos próximos 7 dias", valor: 3 },
      { code: "30_dias", label: "Nos próximos 30 dias", valor: 2 },
      { code: "1_3_meses", label: "Em 1 a 3 meses", valor: 1 },
      { code: "mais_3_meses", label: "Daqui a mais de 3 meses", valor: 0 },
      { code: "sem_previsao", label: "Ainda não tenho previsão", valor: 0 },
    ],
  },
  {
    campo: "tempo_cirurgia",
    numero: 5,
    titulo: "Tempo desejado para cirurgia, caso indicada",
    pontua: true,
    peso: 2,
    options: [
      { code: "quanto_antes", label: "O quanto antes, se for possível", valor: 3 },
      { code: "3_meses", label: "Nos próximos 3 meses", valor: 3 },
      { code: "3_6_meses", label: "Em 3 a 6 meses", valor: 2 },
      { code: "mais_6_meses", label: "Em mais de 6 meses", valor: 1 },
      { code: "nao_pensei", label: "Ainda não pensei sobre isso", valor: 1 },
      { code: "nao_sei_operar", label: "Não sei se realmente quero operar", valor: 0 },
    ],
  },
  {
    campo: "disponibilidade_presencial",
    numero: 6,
    titulo: "Disponibilidade para consulta presencial",
    pontua: true,
    peso: 2,
    options: [
      { code: "sim", label: "Sim, tenho disponibilidade", valor: 3 },
      { code: "combinar", label: "Sim, mas preciso combinar data e horário", valor: 2 },
      { code: "dificuldade", label: "Tenho dificuldade por agenda ou distância", valor: 1 },
      { code: "prefiro_whatsapp", label: "Prefiro primeiro receber informações pelo WhatsApp", valor: 1 },
      { code: "sem_disponibilidade", label: "No momento, não tenho disponibilidade", valor: 0 },
    ],
  },
  {
    campo: "contato_anterior",
    numero: 7,
    titulo: "Contato anterior com a clínica/equipe/profissional",
    pontua: true,
    peso: 1,
    options: [
      { code: "ja_consulta", label: "Sim, já passei em consulta", valor: 3 },
      { code: "ja_conversei", label: "Sim, já conversei com a equipe, mas não consultei", valor: 2 },
      { code: "ja_informacoes", label: "Sim, já pedi informações anteriormente", valor: 2 },
      { code: "primeiro_contato", label: "Não, este é meu primeiro contato", valor: 1 },
      { code: "nao_lembro", label: "Não lembro", valor: 1 },
    ],
  },
  {
    campo: "dificuldade_decisao",
    numero: 8,
    titulo: "Principal dificuldade para decisão",
    pontua: true,
    peso: 2,
    outroCode: "outro",
    outroCampo: "dificuldade_outro",
    options: [
      { code: "nada_avancar", label: "Nada no momento; quero avançar para consulta", valor: 3 },
      { code: "falta_informacao", label: "Falta de informação sobre o procedimento", valor: 2 },
      { code: "duvida_valores", label: "Dúvida sobre valores e formas de pagamento", valor: 2 },
      { code: "medo_inseguranca", label: "Medo ou insegurança em relação à cirurgia", valor: 1 },
      { code: "falta_tempo", label: "Falta de tempo ou agenda", valor: 1 },
      { code: "escolha_profissional", label: "Escolha do profissional ideal", valor: 1 },
      { code: "distancia", label: "Distância ou logística", valor: 1 },
      { code: "nao_certeza", label: "Ainda não tenho certeza se quero realizar", valor: 0 },
      { code: "outro", label: "Outro", valor: 1 },
    ],
  },
  {
    campo: "canal_origem",
    numero: 9,
    titulo: "Como você chegou até nós?",
    descricao: "Usado apenas para análise de marketing. Não influencia o atendimento.",
    pontua: false,
    peso: 0,
    outroCode: "outro",
    outroCampo: "canal_origem_outro",
    options: [
      { code: "instagram", label: "Instagram" },
      { code: "google", label: "Google" },
      { code: "site", label: "Site" },
      { code: "whatsapp", label: "WhatsApp" },
      { code: "indicacao_paciente", label: "Indicação de paciente, amigo ou familiar" },
      { code: "indicacao_profissional", label: "Indicação de outro profissional de saúde" },
      { code: "ja_conhecia", label: "Já conhecia o médico ou a clínica" },
      { code: "outro", label: "Outro" },
    ],
  },
  {
    campo: "proximo_passo",
    numero: 10,
    titulo: "Melhor próximo passo desejado",
    pontua: true,
    peso: 3,
    options: [
      { code: "agendar", label: "Agendar consulta", valor: 3 },
      { code: "whatsapp", label: "Receber contato da equipe pelo WhatsApp", valor: 2 },
      { code: "disponibilidade_agenda", label: "Entender disponibilidade de agenda", valor: 2 },
      { code: "valores_consulta", label: "Entender valores iniciais da consulta", valor: 2 },
      { code: "informacoes_gerais", label: "Receber informações gerais antes de decidir", valor: 1 },
      { code: "nao_contatar", label: "Ainda não quero ser contatado(a), apenas estou pesquisando", valor: 0 },
    ],
  },
];

export const SCORED_QUESTIONS = QUESTIONS.filter((q) => q.pontua);

// Score máximo: soma de (peso × maior valor) por pergunta pontuada = 54.
export const SCORE_MAXIMO = SCORED_QUESTIONS.reduce((acc, q) => {
  const maxValor = Math.max(...q.options.map((o) => o.valor ?? 0));
  return acc + q.peso * maxValor;
}, 0);

export function getQuestion(campo: string): Question | undefined {
  return QUESTIONS.find((q) => q.campo === campo);
}

export function getOptionLabel(campo: string, code: string): string {
  const opt = getQuestion(campo)?.options.find((o) => o.code === code);
  return opt?.label ?? code;
}
