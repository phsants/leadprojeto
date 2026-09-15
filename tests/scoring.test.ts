// Testes da matriz v1.0 — reproduz a aba "Casos de teste" da planilha
// "Matriz mestre definitiva v1.0" e os critérios de aceite (seção 13) do
// documento técnico-funcional v2. Rode com: npm test
import assert from "node:assert/strict";
import { QUESTIONS, SCORED_QUESTIONS, SCORE_MAXIMO } from "../src/lib/form-schema";
import { camposFaltantes, classificar, computeScore, FAIXAS, MATRIX_VERSION, type Answers } from "../src/lib/scoring";

let passed = 0;
function test(nome: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✔ ${nome}`);
  } catch (e) {
    console.error(`  ✘ ${nome}`);
    throw e;
  }
}

/** Resposta de maior valor de cada pergunta pontuada + 1ª opção das demais. */
function melhorResposta(): Answers {
  const a: Answers = {};
  for (const q of QUESTIONS) {
    const best = q.pontua ? q.options.slice().sort((x, y) => (y.valor ?? 0) - (x.valor ?? 0))[0] : q.options[0];
    a[q.campo] = best.code;
  }
  return a;
}
/** Pior resposta de cada pergunta pontuada (inclui "não quero contato" em Q10). */
function piorResposta(): Answers {
  const a: Answers = {};
  for (const q of QUESTIONS) {
    const worst = q.pontua ? q.options.slice().sort((x, y) => (x.valor ?? 0) - (y.valor ?? 0))[0] : q.options[0];
    a[q.campo] = worst.code;
  }
  return a;
}

/**
 * Tabela total -> respostas, enumerando todas as combinações de VALOR por pergunta
 * pontuada (uma opção representante por valor). Quando `semNaoContato` é true,
 * evita a opção que dispara a sobrescrita para D, para testar a classe por score.
 */
function tabelaDeTotais(semNaoContato: boolean): Map<number, Answers> {
  const porPergunta = SCORED_QUESTIONS.map((q) => {
    const porValor = new Map<number, string>();
    for (const o of q.options) {
      if (semNaoContato && q.campo === "proximo_passo" && o.code === "nao_contatar") continue;
      if (!porValor.has(o.valor ?? 0)) porValor.set(o.valor ?? 0, o.code);
    }
    return { campo: q.campo, peso: q.peso, opcoes: [...porValor.entries()] };
  });
  const tabela = new Map<number, Answers>();
  const naoPontuam: Answers = {};
  for (const q of QUESTIONS) if (!q.pontua) naoPontuam[q.campo] = q.options[0].code;

  const rec = (i: number, total: number, atual: Answers) => {
    if (i === porPergunta.length) {
      if (!tabela.has(total)) tabela.set(total, { ...naoPontuam, ...atual });
      return;
    }
    const p = porPergunta[i];
    for (const [valor, code] of p.opcoes) {
      atual[p.campo] = code;
      rec(i + 1, total + p.peso * valor, atual);
    }
  };
  rec(0, 0, {});
  return tabela;
}
const TOTAIS_SEM_NAO_CONTATO = tabelaDeTotais(true);
const TOTAIS_TODOS = tabelaDeTotais(false);

/** Respostas com total exato `alvo`, sem acionar a sobrescrita de não-contato. */
function respostasComTotal(alvo: number): Answers {
  const a = TOTAIS_SEM_NAO_CONTATO.get(alvo);
  assert.ok(a, `nenhuma combinação (sem "não contato") produz total ${alvo}`);
  const r = computeScore(a);
  assert.equal(r.scoreTotal, alvo);
  return a;
}

console.log(`Matriz v${MATRIX_VERSION} — ${SCORE_MAXIMO} pontos`);

test("versão da matriz é 1.0", () => assert.equal(MATRIX_VERSION, "1.0"));

test("score máximo é 54 e os 8 subtotais máximos batem com a planilha (6,9,9,6,6,3,6,9)", () => {
  assert.equal(SCORE_MAXIMO, 54);
  const esperado: Record<string, number> = {
    clareza_demanda: 6,
    momento_atual: 9,
    tempo_consulta: 9,
    tempo_cirurgia: 6,
    disponibilidade_presencial: 6,
    contato_anterior: 3,
    dificuldade_decisao: 6,
    proximo_passo: 9,
  };
  assert.equal(SCORED_QUESTIONS.length, 8);
  for (const q of SCORED_QUESTIONS) {
    const max = Math.max(...q.options.map((o) => o.valor ?? 0)) * q.peso;
    assert.equal(max, esperado[q.campo], q.campo);
  }
});

test("Q1 (procedimento) e Q9 (canal) não pontuam", () => {
  for (const campo of ["procedimento_interesse", "canal_origem"]) {
    const q = QUESTIONS.find((x) => x.campo === campo)!;
    assert.equal(q.pontua, false);
    assert.equal(q.peso, 0);
  }
});

test("máximo 54 e mínimo alcançável 1 (Q7 não tem opção zero) reproduzem cálculo manual", () => {
  const r = computeScore(melhorResposta());
  assert.equal(r.scoreTotal, 54);
  // Pior resposta em tudo: Q7 vale no mínimo 1×1 = 1 pt; todo o resto zera.
  assert.equal(computeScore(piorResposta()).scoreTotal, 1);
  assert.equal(
    r.detalhe.reduce((s, d) => s + d.pontuacao, 0),
    r.scoreTotal
  );
  for (const d of r.detalhe) assert.equal(d.pontuacao, d.valor * d.peso);
  // Todo total inteiro de 1 a 54 é alcançável; 0 é apenas o limite inferior da faixa D.
  for (let t = 1; t <= 54; t++) assert.ok(TOTAIS_TODOS.has(t), `total ${t} inalcançável`);
  assert.ok(!TOTAIS_TODOS.has(0));
});

test("limites absolutos: 13=D, 14=C, 26=C, 27=B, 40=B, 41=A, 54=A (e 0=D)", () => {
  assert.equal(classificar(0), "D");
  const casos: [number, string][] = [
    [13, "D"],
    [14, "C"],
    [26, "C"],
    [27, "B"],
    [40, "B"],
    [41, "A"],
    [54, "A"],
  ];
  for (const [total, classe] of casos) {
    assert.equal(classificar(total), classe, `classificar(${total})`);
    const r = computeScore(respostasComTotal(total));
    assert.equal(r.scoreTotal, total);
    assert.equal(r.classificacaoPorScore, classe, `computeScore total ${total}`);
    assert.equal(r.classificacaoFinal, classe);
    assert.equal(r.overrideReason, null);
  }
});

test("faixas cobrem 0..54 sem buraco nem sobreposição", () => {
  const ordenadas = FAIXAS.slice().sort((a, b) => a.min - b.min);
  assert.equal(ordenadas[0].min, 0);
  assert.equal(ordenadas[ordenadas.length - 1].max, 54);
  for (let i = 1; i < ordenadas.length; i++) assert.equal(ordenadas[i].min, ordenadas[i - 1].max + 1);
});

test("percentual não muda classe por arredondamento (classe vem do total absoluto)", () => {
  // 40/54 = 74,07% -> B ; 41/54 = 75,9% -> A ; 27/54 = 50,0% -> B ; 26/54 = 48,1% -> C
  for (let total = 1; total <= 54; total++) {
    const r = computeScore(TOTAIS_TODOS.get(total)!);
    assert.equal(r.scoreTotal, total);
    assert.equal(r.classificacaoPorScore, classificar(total));
    assert.equal(r.scorePercentual, Math.round((total / 54) * 1000) / 10);
  }
});

test("não contato sobrescreve para D, preserva score base e impede fila ativa", () => {
  // Caso de teste "Não contato": score 45 -> Lead D
  const a = melhorResposta(); // 54
  a.proximo_passo = "nao_contatar"; // -9 => 45
  const r = computeScore(a);
  assert.equal(r.scoreTotal, 45);
  assert.equal(r.classificacaoPorScore, "A");
  assert.equal(r.classificacaoFinal, "D");
  assert.ok(r.overrideReason && r.overrideReason.length > 0);
  assert.ok(r.flags.includes("nao_acionar_comercialmente"));
});

test("flags não alteram o total nem a classe", () => {
  const a = melhorResposta();
  a.procedimento_interesse = "reparador";
  a.disponibilidade_presencial = "sem_disponibilidade"; // 2*3 -> 0 => 48
  a.dificuldade_decisao = "medo_inseguranca"; // 2*3 -> 2*1 => 44
  const r = computeScore(a);
  assert.equal(r.scoreTotal, 44);
  assert.equal(r.classificacaoFinal, "A");
  assert.deepEqual(
    r.flags.slice().sort(),
    ["avaliar_fluxo_reparador", "baixa_disponibilidade", "necessita_abordagem_educativa"]
  );
  assert.equal(r.overrideReason, null);
});

test("lead educacional: apenas pesquisando + sem pedido de contato => flag, classe mantida", () => {
  const a = respostasComTotal(20);
  a.momento_atual = "pesquisando";
  a.proximo_passo = "informacoes_gerais";
  const r = computeScore(a);
  assert.ok(r.flags.includes("lead_educacional"));
  assert.ok(!r.flags.includes("lead_informativo"));
  assert.equal(r.classificacaoFinal, r.classificacaoPorScore);
});

test("procedimento e origem alterados não mudam score nem classe", () => {
  const a = respostasComTotal(30);
  const base = computeScore(a);
  for (const proc of QUESTIONS.find((q) => q.campo === "procedimento_interesse")!.options) {
    for (const canal of QUESTIONS.find((q) => q.campo === "canal_origem")!.options) {
      const r = computeScore({ ...a, procedimento_interesse: proc.code, canal_origem: canal.code });
      assert.equal(r.scoreTotal, base.scoreTotal);
      assert.equal(r.classificacaoFinal, base.classificacaoFinal);
    }
  }
});

test("registro incompleto: campo obrigatório ausente => sem classe A–D", () => {
  const a = melhorResposta();
  delete a.momento_atual;
  const faltam = camposFaltantes({
    nome: "Maria",
    whatsapp: "11999999999",
    consentimentoContato: true,
    consentimentoPrivacidade: true,
    answers: a,
  });
  assert.deepEqual(faltam, ["momento_atual"]);
  const r = computeScore(a, { camposFaltantes: faltam });
  assert.equal(r.classificacaoPorScore, "incompleto");
  assert.equal(r.classificacaoFinal, "incompleto");
  assert.ok(r.flags.includes("registro_incompleto"));
  assert.equal(r.overrideReason, null);
});

test("registro incompleto: consentimento ausente também bloqueia a classe", () => {
  const faltam = camposFaltantes({
    nome: "Maria",
    whatsapp: "11999999999",
    consentimentoContato: false,
    consentimentoPrivacidade: true,
    answers: melhorResposta(),
  });
  assert.deepEqual(faltam, ["consentimento_contato"]);
});

test("registro completo => lista de faltantes vazia", () => {
  assert.deepEqual(
    camposFaltantes({
      nome: "Maria",
      whatsapp: "11999999999",
      consentimentoContato: true,
      consentimentoPrivacidade: true,
      answers: melhorResposta(),
    }),
    []
  );
});

test("resposta desconhecida pontua 0 (tolerância) e valor bruto é inteiro", () => {
  const a = melhorResposta();
  a.clareza_demanda = "xyz";
  const r = computeScore(a);
  assert.equal(r.scoreTotal, 48);
  assert.ok(Number.isInteger(r.scoreTotal));
});

console.log(`\n${passed} teste(s) OK`);
