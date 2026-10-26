// Testes do funil de atendimento (KPIs fora do escore). Rode com: npm test
import assert from "node:assert/strict";
import { calcularFunil, formatarDuracao, type LeadFunil } from "../src/lib/kpis";

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

const t0 = new Date("2026-10-01T10:00:00Z");
const h = (n: number) => new Date(t0.getTime() + n * 3_600_000);

const leads: LeadFunil[] = [
  // contatado em 2 h, agendou e compareceu
  {
    criadoEm: t0,
    status: "compareceu",
    classificacao: "A",
    historico: [
      { statusNovo: "contato_realizado", criadoEm: h(2) },
      { statusNovo: "consulta_agendada", criadoEm: h(5) },
      { statusNovo: "compareceu", criadoEm: h(48) },
    ],
  },
  // contatado em 6 h, agendou e faltou
  {
    criadoEm: t0,
    status: "nao_compareceu",
    classificacao: "B",
    historico: [
      { statusNovo: "aguardando_resposta", criadoEm: h(6) },
      { statusNovo: "consulta_agendada", criadoEm: h(10) },
      { statusNovo: "nao_compareceu", criadoEm: h(50) },
    ],
  },
  // contatado em 10 h, sem agendamento
  { criadoEm: t0, status: "perdeu_interesse", classificacao: "C", historico: [{ statusNovo: "contato_realizado", criadoEm: h(10) }, { statusNovo: "perdeu_interesse", criadoEm: h(30) }] },
  // nunca contatado
  { criadoEm: t0, status: "novo", classificacao: "D", historico: [] },
  // incompleto: fora da base
  { criadoEm: t0, status: "contato_realizado", classificacao: "incompleto", historico: [{ statusNovo: "contato_realizado", criadoEm: h(1) }] },
];

console.log("Funil de atendimento");

test("base exclui Lead incompleto", () => {
  assert.equal(calcularFunil(leads).base, 4);
});

test("tempo até o 1º contato = mediana das horas (2, 6, 10 => 6)", () => {
  const f = calcularFunil(leads);
  assert.equal(f.contatados, 3);
  assert.equal(f.medianaHorasPrimeiroContato, 6);
});

test("agendamento, comparecimento e conversão", () => {
  const f = calcularFunil(leads);
  assert.equal(f.agendados, 2);
  assert.equal(f.compareceram, 1);
  assert.equal(f.taxaAgendamento, 50);
  assert.equal(f.taxaComparecimento, 50);
  assert.equal(f.taxaConversao, 25);
});

test("sem dados não divide por zero", () => {
  const f = calcularFunil([]);
  assert.equal(f.base, 0);
  assert.equal(f.medianaHorasPrimeiroContato, null);
  assert.equal(f.taxaAgendamento, 0);
  assert.equal(f.taxaComparecimento, 0);
  assert.equal(formatarDuracao(null), "—");
});

test("formatação de duração", () => {
  assert.equal(formatarDuracao(6), "6 h");
  assert.equal(formatarDuracao(72), "3 dias");
  assert.equal(formatarDuracao(0.25), "15 min");
  assert.equal(formatarDuracao(0), "1 min");
});

console.log(`\n${passed} teste(s) OK`);
