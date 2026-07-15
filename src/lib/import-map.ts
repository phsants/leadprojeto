// Utilitários para importar cadastros de um CSV com colunas/valores variados.
// Estratégia tolerante: casa cabeçalhos e respostas pelo nome; o que não for
// reconhecido é ignorado (pergunta não mapeada) ou fica vazio (pontua 0).

import { QUESTIONS } from "./form-schema";

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (marcas diacriticas)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Campos cadastrais (texto livre, não pontuam).
export const CADASTRAIS = ["nome", "whatsapp", "email", "cidade_estado"] as const;

// Sinônimos de cabeçalho por campo (comparados já normalizados).
const HEADER_SYNONYMS: Record<string, string[]> = {
  nome: ["nome", "nomecompleto", "paciente", "cliente", "lead", "name"],
  whatsapp: ["whatsapp", "whats", "telefone", "celular", "fone", "contato", "zap", "phone", "tel"],
  email: ["email", "mail"],
  cidade_estado: ["cidadeestado", "cidadeuf", "cidade", "uf", "estado", "municipio", "localidade"],
  procedimento_interesse: ["procedimento", "procedimentointeresse", "regiaodeinteresse", "interesse", "cirurgia"],
  clareza_demanda: ["clarezademanda", "clareza"],
  momento_atual: ["momentoatual", "momento"],
  tempo_consulta: ["tempoconsulta", "prazoconsulta", "quandoconsulta"],
  tempo_cirurgia: ["tempocirurgia", "prazocirurgia"],
  disponibilidade_presencial: ["disponibilidadepresencial", "disponibilidade", "presencial"],
  contato_anterior: ["contatoanterior", "contatoprevio", "jaconhece"],
  dificuldade_decisao: ["dificuldadedecisao", "dificuldade", "principaldificuldade"],
  canal_origem: ["canalorigem", "canal", "origem", "comochegou", "comoconheceu", "fonte"],
  proximo_passo: ["proximopasso", "melhorproximopasso"],
};

// Constrói o conjunto de sinônimos completo (inclui o próprio campo e o título da pergunta).
const FIELD_MATCHERS: { field: string; keys: Set<string> }[] = (() => {
  const out: { field: string; keys: Set<string> }[] = [];
  const add = (field: string, extra: string[] = []) => {
    const keys = new Set<string>([normalize(field), ...extra.map(normalize)]);
    const q = QUESTIONS.find((x) => x.campo === field);
    if (q) keys.add(normalize(q.titulo));
    out.push({ field, keys });
  };
  for (const c of CADASTRAIS) add(c, HEADER_SYNONYMS[c]);
  for (const q of QUESTIONS) add(q.campo, HEADER_SYNONYMS[q.campo] ?? []);
  return out;
})();

/** Casa um cabeçalho de coluna com um campo conhecido, ou null se não reconhecer. */
export function matchHeader(header: string): string | null {
  const n = normalize(header);
  if (!n) return null;
  for (const m of FIELD_MATCHERS) if (m.keys.has(n)) return m.field;
  return null;
}

/** Casa o valor de uma célula com o código de uma opção da pergunta, ou "" se não reconhecer. */
export function matchValue(campo: string, raw: string): string {
  const q = QUESTIONS.find((x) => x.campo === campo);
  if (!q) return "";
  const n = normalize(raw);
  if (!n) return "";
  for (const o of q.options) {
    if (normalize(o.code) === n || normalize(o.label) === n) return o.code;
  }
  return "";
}

/** Parser de CSV (aspas com "" escapado, delimitador ; ou , detectado, CRLF/LF, BOM). */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  let t = text.replace(/^﻿/, "");
  const firstLine = t.slice(0, t.search(/\r?\n/) === -1 ? t.length : t.search(/\r?\n/));
  const delim = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQuotes) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else if (ch === "\r") {
      // ignora (tratado no \n)
    } else field += ch;
  }
  // último campo/linha
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const headers = (rows.shift() ?? []).map((h) => h.trim());
  // descarta linhas totalmente vazias
  const clean = rows.filter((r) => r.some((c) => c.trim() !== ""));
  return { headers, rows: clean };
}

export type ParsedLead = {
  nome: string;
  whatsapp: string;
  email: string;
  cidade_estado: string;
  answers: Record<string, string>;
};

/** Converte as linhas em cadastros, casando colunas por cabeçalho. */
export function rowsToLeads(headers: string[], rows: string[][]) {
  const fieldByIndex = headers.map((h) => matchHeader(h));
  const ignoredColumns = headers.filter((h, i) => h.trim() !== "" && fieldByIndex[i] === null);
  const matchedFields = new Set(fieldByIndex.filter(Boolean) as string[]);

  const leads: ParsedLead[] = rows.map((r) => {
    const cad = { nome: "", whatsapp: "", email: "", cidade_estado: "" };
    const answers: Record<string, string> = {};
    fieldByIndex.forEach((field, i) => {
      if (!field) return;
      const raw = (r[i] ?? "").trim();
      if ((CADASTRAIS as readonly string[]).includes(field)) {
        (cad as Record<string, string>)[field] = raw;
      } else {
        answers[field] = matchValue(field, raw);
      }
    });
    return { ...cad, answers };
  });

  return { leads, ignoredColumns, matchedFields: [...matchedFields] };
}
