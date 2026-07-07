// Validação do payload do formulário público com Zod, derivada da form-schema.
import { z } from "zod";
import { QUESTIONS } from "./form-schema";

function optionCodes(campo: string): [string, ...string[]] {
  const q = QUESTIONS.find((x) => x.campo === campo)!;
  const codes = q.options.map((o) => o.code);
  return codes as [string, ...string[]];
}

export const leadFormSchema = z
  .object({
    // Cadastrais
    nome: z.string().trim().min(2, "Informe seu nome").max(120),
    whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido").max(30),
    email: z.string().trim().email("E-mail inválido").max(160).optional().or(z.literal("")),
    cidade_estado: z.string().trim().max(120).optional().or(z.literal("")),

    // Perguntas
    procedimento_interesse: z.enum(optionCodes("procedimento_interesse")),
    procedimento_outro: z.string().trim().max(200).optional().or(z.literal("")),
    clareza_demanda: z.enum(optionCodes("clareza_demanda")),
    momento_atual: z.enum(optionCodes("momento_atual")),
    tempo_consulta: z.enum(optionCodes("tempo_consulta")),
    tempo_cirurgia: z.enum(optionCodes("tempo_cirurgia")),
    disponibilidade_presencial: z.enum(optionCodes("disponibilidade_presencial")),
    contato_anterior: z.enum(optionCodes("contato_anterior")),
    dificuldade_decisao: z.enum(optionCodes("dificuldade_decisao")),
    dificuldade_outro: z.string().trim().max(200).optional().or(z.literal("")),
    canal_origem: z.enum(optionCodes("canal_origem")),
    canal_origem_outro: z.string().trim().max(200).optional().or(z.literal("")),
    proximo_passo: z.enum(optionCodes("proximo_passo")),

    // Consentimentos (seção 4)
    consentimento_contato: z.literal(true, {
      errorMap: () => ({ message: "É necessário autorizar o contato da equipe." }),
    }),
    consentimento_privacidade: z.literal(true, {
      errorMap: () => ({ message: "É necessário aceitar o termo de privacidade." }),
    }),

    // Metadados opcionais
    origem_utm: z.record(z.string()).optional(),
  })
  .refine((d) => d.procedimento_interesse !== "outro" || !!d.procedimento_outro, {
    message: "Descreva o procedimento em 'Outro'.",
    path: ["procedimento_outro"],
  })
  .refine((d) => d.dificuldade_decisao !== "outro" || !!d.dificuldade_outro, {
    message: "Descreva a dificuldade em 'Outro'.",
    path: ["dificuldade_outro"],
  })
  .refine((d) => d.canal_origem !== "outro" || !!d.canal_origem_outro, {
    message: "Descreva a origem em 'Outro'.",
    path: ["canal_origem_outro"],
  });

export type LeadFormInput = z.infer<typeof leadFormSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  senha: z.string().min(6, "Senha muito curta"),
});
