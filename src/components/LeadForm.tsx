"use client";

import { useEffect, useMemo, useState } from "react";
import { QUESTIONS, CAMPOS_CADASTRAIS } from "@/lib/form-schema";

type Answers = Record<string, string>;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

export default function LeadForm() {
  const [step, setStep] = useState(0);
  const [contato, setContato] = useState({ nome: "", whatsapp: "", email: "", cidade_estado: "" });
  const [answers, setAnswers] = useState<Answers>({});
  const [outros, setOutros] = useState<Record<string, string>>({});
  const [consentContato, setConsentContato] = useState(false);
  const [consentPriv, setConsentPriv] = useState(false);
  const [utm, setUtm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Passos: 0 = contato, 1..N = perguntas, N+1 = consentimentos
  const totalSteps = QUESTIONS.length + 2;
  const progress = Math.round((step / (totalSteps - 1)) * 100);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) found[k] = v;
    }
    setUtm(found);
  }, []);

  const currentQuestion = useMemo(() => {
    if (step >= 1 && step <= QUESTIONS.length) return QUESTIONS[step - 1];
    return null;
  }, [step]);

  function validateStep(): string | null {
    if (step === 0) {
      if (contato.nome.trim().length < 2) return "Informe seu nome.";
      if (contato.whatsapp.trim().length < 8) return "Informe um WhatsApp válido.";
      if (contato.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato.email)) return "E-mail inválido.";
      return null;
    }
    if (currentQuestion) {
      const val = answers[currentQuestion.campo];
      if (!val) return "Selecione uma opção para continuar.";
      if (currentQuestion.outroCode && val === currentQuestion.outroCode) {
        if (!outros[currentQuestion.outroCampo!]?.trim()) return "Preencha o campo \"Outro\".";
      }
      return null;
    }
    // consentimentos
    if (!consentContato) return "É necessário autorizar o contato da equipe.";
    if (!consentPriv) return "É necessário aceitar o termo de privacidade.";
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        nome: contato.nome,
        whatsapp: contato.whatsapp,
        email: contato.email || undefined,
        cidade_estado: contato.cidade_estado || undefined,
        ...answers,
        procedimento_outro: outros.procedimento_outro || undefined,
        dificuldade_outro: outros.dificuldade_outro || undefined,
        canal_origem_outro: outros.canal_origem_outro || undefined,
        consentimento_contato: consentContato,
        consentimento_privacidade: consentPriv,
        origem_utm: Object.keys(utm).length ? utm : undefined,
      };
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível enviar. Tente novamente.");
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-ink-900">Obrigado pelo preenchimento.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-500">
          Suas respostas ajudarão nossa equipe a organizar melhor o atendimento inicial e direcionar o
          melhor próximo passo. A avaliação definitiva deverá ser realizada em consulta médica
          individualizada.
        </p>
      </div>
    );
  }

  const isConsentStep = step === totalSteps - 1;
  const isLastQuestion = step === QUESTIONS.length;

  return (
    <div className="card overflow-hidden">
      {/* Barra de progresso */}
      <div className="h-1.5 w-full bg-ink-100">
        <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="p-6 sm:p-8">
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-brand-600">
          Passo {step + 1} de {totalSteps}
        </p>

        {/* Passo contato */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-ink-900">Seus dados de contato</h2>
            <div>
              <label className="label">{CAMPOS_CADASTRAIS.nome.label} *</label>
              <input
                className="input"
                value={contato.nome}
                onChange={(e) => setContato({ ...contato, nome: e.target.value })}
                placeholder="Como podemos te chamar?"
              />
            </div>
            <div>
              <label className="label">{CAMPOS_CADASTRAIS.whatsapp.label} *</label>
              <input
                className="input"
                value={contato.whatsapp}
                onChange={(e) => setContato({ ...contato, whatsapp: e.target.value })}
                placeholder="(00) 00000-0000"
                inputMode="tel"
              />
            </div>
            <div>
              <label className="label">{CAMPOS_CADASTRAIS.email.label}</label>
              <input
                className="input"
                value={contato.email}
                onChange={(e) => setContato({ ...contato, email: e.target.value })}
                placeholder="seu@email.com"
                inputMode="email"
              />
            </div>
            <div>
              <label className="label">{CAMPOS_CADASTRAIS.cidade_estado.label}</label>
              <input
                className="input"
                value={contato.cidade_estado}
                onChange={(e) => setContato({ ...contato, cidade_estado: e.target.value })}
                placeholder="Cidade / UF"
              />
            </div>
          </div>
        )}

        {/* Passo de pergunta */}
        {currentQuestion && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">{currentQuestion.titulo}</h2>
              {currentQuestion.descricao && (
                <p className="mt-1 text-sm text-ink-500">{currentQuestion.descricao}</p>
              )}
            </div>
            <div className="space-y-2.5">
              {currentQuestion.options.map((opt) => {
                const selected = answers[currentQuestion.campo] === opt.code;
                return (
                  <label
                    key={opt.code}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                      selected
                        ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                        : "border-ink-200 bg-white hover:border-ink-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name={currentQuestion.campo}
                      className="h-4 w-4 accent-brand-600"
                      checked={selected}
                      onChange={() =>
                        setAnswers({ ...answers, [currentQuestion.campo]: opt.code })
                      }
                    />
                    <span className={selected ? "font-medium text-ink-900" : "text-ink-700"}>
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>

            {currentQuestion.outroCode &&
              answers[currentQuestion.campo] === currentQuestion.outroCode && (
                <input
                  className="input"
                  placeholder="Descreva aqui..."
                  value={outros[currentQuestion.outroCampo!] ?? ""}
                  onChange={(e) =>
                    setOutros({ ...outros, [currentQuestion.outroCampo!]: e.target.value })
                  }
                />
              )}
          </div>
        )}

        {/* Passo consentimentos */}
        {isConsentStep && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-ink-900">Quase lá!</h2>
            <p className="text-sm text-ink-500">
              Para concluir, confirme os itens abaixo.
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 p-4">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-brand-600"
                checked={consentContato}
                onChange={(e) => setConsentContato(e.target.checked)}
              />
              <span className="text-sm text-ink-700">
                Autorizo o contato da equipe pelos dados informados.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 p-4">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-brand-600"
                checked={consentPriv}
                onChange={(e) => setConsentPriv(e.target.checked)}
              />
              <span className="text-sm text-ink-700">
                Estou ciente de que meus dados serão usados para organizar o atendimento inicial.
              </span>
            </label>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </p>
        )}

        {/* Navegação */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="btn-ghost disabled:invisible"
          >
            Voltar
          </button>
          {isConsentStep ? (
            <button type="button" onClick={submit} disabled={submitting} className="btn-primary">
              {submitting ? "Enviando..." : "Enviar respostas"}
            </button>
          ) : (
            <button type="button" onClick={next} className="btn-primary">
              {isLastQuestion ? "Continuar" : "Avançar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
